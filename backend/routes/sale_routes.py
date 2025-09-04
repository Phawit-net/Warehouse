import math
import traceback
from flask import abort, Blueprint, jsonify, request, send_from_directory
from model import ProductVariant, SaleItem, SaleItemBatch, StockBatch, StockMovement, db,Product, SalesChannel, Sale
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.utils import secure_filename
from datetime import datetime, date
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import func, distinct

sale_bp = Blueprint('sale_bp', __name__, url_prefix='/api/sale')

def _today_utc():
    return datetime.utcnow()

def _is_expired(expiry: date | None) -> bool:
    return bool(expiry and expiry < date.today())

def _allocate_fefo(product_id: int, units_needed: int):
    if units_needed <= 0:
        return []
    # FEFO: NULL expiry ไปท้าย
    batches = (
        db.session.query(StockBatch)
        .filter(StockBatch.product_id == product_id, StockBatch.qty_remaining > 0)
        .order_by((StockBatch.expiry_date.is_(None)).asc(), StockBatch.expiry_date.asc())
        .with_for_update()  # SQLite จะ ignore; DB อื่นจะ lock แถวให้
        .all()
    )
    plan, remain = [], units_needed
    for b in batches:
        if _is_expired(b.expiry_date):
            continue
        take = min(int(b.qty_remaining or 0), remain)
        if take <= 0:
            continue
        plan.append((b.id, take))
        remain -= take
        if remain <= 0:
            break
    if remain > 0:
        raise ValueError(f"Not enough stock: need {units_needed}, short {remain}")
    return plan


# 1. API POST - create sale order
@sale_bp.route('/<int:product_id>', methods=['POST'])
def create_sale_single(product_id):
    try:
        p = request.form

        # 1) Validate base
        channel_id  = p.get("channel_id")
        variant_id  = p.get("variant_id")
        qty_pack    = p.get("quantity_pack")
        unit_price  = p.get("unit_price_at_sale")

        if not channel_id:
            return jsonify({"error": "❌ channel_id is required"}), 400
        if not variant_id:
            return jsonify({"error": "❌ variant_id is required"}), 400
        if qty_pack is None or int(qty_pack) <= 0:
            return jsonify({"error": "❌ quantity_pack must be > 0"}), 400
        if unit_price is None or float(unit_price) < 0:
            return jsonify({"error": "❌ unit_price_at_sale is required"}), 400

        sale_date_str = p.get("sale_date")
        sale_date = datetime.fromisoformat(sale_date_str) if sale_date_str else _today_utc()

        shipping_fee      = float(p.get("shipping_fee") or 0)
        shop_discount     = float(p.get("shop_discount") or 0)
        platform_discount = float(p.get("platform_discount") or 0)
        coin_discount     = float(p.get("coin_discount") or 0)
        vat_amount        = float(p.get("vat_amount") or 0)

        # 2) Snapshot channel %
        channel = (
            db.session.query(SalesChannel)
            .options(joinedload(SalesChannel.platform_tier))
            .get(int(channel_id))
        )
        if not channel:
            return jsonify({"error": "❌ SalesChannel not found"}), 404

        tier = channel.platform_tier
        if not tier:
            return jsonify({"error": "❌ SalesChannel has no PlatformTier bound"}), 400

        commission_pct  = float(tier.commission_percent or 0.0)
        transaction_pct = float(tier.transaction_percent or 0.0)

        # 3) Resolve product + variant (และล็อก snapshot จาก variant)
        variant = (
            db.session.query(ProductVariant)
            .options(joinedload(ProductVariant.product))
            .get(variant_id)
        )
        if not variant or int(variant.product_id) != int(product_id):
            return jsonify({"error": "❌ variant_id does not belong to product_id"}), 400

        pack_size = int(variant.pack_size or 0)
        if pack_size <= 0:
            return jsonify({"error": "❌ variant.pack_size invalid"}), 400

        sale_mode = variant.sale_mode or "variant"
        qty_pack  = int(qty_pack)
        base_units = pack_size * qty_pack
        unit_price = float(unit_price)
        line_total = unit_price * qty_pack

        # 4) วางแผน FEFO ก่อนทำจริง
        plan = _allocate_fefo(product_id, base_units)  # [(batch_id, qty), ...]

        # 5) Persist ทั้งบิล (หนึ่งรายการเดียว)
        with db.session.begin_nested():
            sale = Sale(
                channel_id=channel.id,
                sale_date=sale_date,
                customer_name=p.get("customer_name"),
                province=p.get("province"),
                # note=p.get("note"),
                channel_name_at_sale=channel.channel_name,
                commission_percent_at_sale=commission_pct,
                transaction_percent_at_sale=transaction_pct,
                shipping_fee=shipping_fee,
                shop_discount=shop_discount,
                platform_discount=platform_discount,
                coin_discount=coin_discount,
            )
            db.session.add(sale)
            db.session.flush()

            si = SaleItem(
                sale_id=sale.id,
                product_id=product_id,
                variant_id=variant_id,
                sale_mode_at_sale=sale_mode,
                pack_size_at_sale=pack_size,
                quantity_pack=qty_pack,
                unit_price_at_sale=unit_price,
                base_units=base_units,
                line_total=line_total,
            )
            db.session.add(si)
            db.session.flush()

            # ตัดล็อตตามแผน
            for (batch_id, cut_qty) in plan:
                batch = db.session.get(StockBatch, batch_id)
                if not batch:
                    raise ValueError(f"Batch not found: {batch_id}")
                if _is_expired(batch.expiry_date):
                    raise ValueError(f"Batch expired while allocating: {batch_id}")
                if int(batch.qty_remaining or 0) < int(cut_qty):
                    raise ValueError("Concurrent update: batch not enough")

                batch.qty_remaining = int(batch.qty_remaining) - int(cut_qty)

                db.session.add(SaleItemBatch(
                    sale_item_id=si.id,
                    product_id=product_id,
                    batch_id=batch.id,
                    qty=int(cut_qty),
                ))

                db.session.add(StockMovement(
                    product_id=product_id,
                    batch_id=batch.id,
                    movement_type="OUT",
                    qty=-int(cut_qty),
                    batch_qty_remaining=int(batch.qty_remaining),
                    ref_sale_id=sale.id,
                    note=f"SaleItem #{si.id}",
                ))

            # คิดยอดบิล (อย่างง่าย)
            sale.subtotal = float(line_total)
            sale.customer_pay = sale.subtotal - shop_discount  - platform_discount - coin_discount + shipping_fee
            sale.commission_fee  = math.floor(sale.subtotal * (commission_pct / 100.0))
            sale.transaction_fee = round((sale.customer_pay + platform_discount + coin_discount) * (transaction_pct / 100.0))
            sale.vat_amount = (sale.commission_fee + sale.transaction_fee) * 7 / 107
            sale.seller_receive = sale.subtotal - sale.commission_fee - sale.transaction_fee - shop_discount
        db.session.commit()

        # 6) Response
        return jsonify({
            "message": "✅ Sale created",
            "sale_id": sale.id,
            "product_id": product_id,
            "variant_id": variant_id,
            "fefo_allocation": [{"batch_id": b, "qty": q} for (b, q) in plan],
            "channel": {
                "id": sale.channel_id,
                "name": sale.channel_name_at_sale,
                "commission_percent": sale.commission_percent_at_sale,
                "transaction_percent": sale.transaction_percent_at_sale
            },
            "totals": {
                "subtotal": sale.subtotal,
                "shipping_fee": sale.shipping_fee,
                "discounts": {
                    "shop_discount": sale.shop_discount,
                    "platform_discount": sale.platform_discount,
                    "coin_discount": sale.coin_discount
                },
                "vat_amount": sale.vat_amount,
                "commission_fee": sale.commission_fee,
                "transaction_fee": sale.transaction_fee,
                "customer_pay": sale.customer_pay,
                "seller_receive": sale.seller_receive
            }
        }), 201

    except ValueError as e:
        db.session.rollback()
        return jsonify({"error": f"❌ {str(e)}"}), 400
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()  # << จะพิมพ์ไฟล์/บรรทัดที่พังใน console
        return jsonify({"error": f"❌ Failed to create sale: {str(e)}"}), 500
    
# 2. API GET - get all sale orders by Product Id with pagination
@sale_bp.route("/<int:product_id>", methods=["GET"])
def get_all_sale_orders(product_id):
    try:
        # pagination
        page  = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        offset = (page - 1) * limit

        include_alloc = request.args.get('include_allocations') in ("1", "true", "True")

        # ดึงเฉพาะใบขายที่มี SaleItem ของ product นี้
        # (ในระบบคุณ 1 ใบ = 1 รายการอยู่แล้ว แต่เขียนให้เผื่ออนาคต)
        q = (
            db.session.query(Sale)
            .join(Sale.items)  # join SaleItem
            .filter(SaleItem.product_id == product_id)
            .options(
                # โหลด items (และ variant snapshot) มาในครั้งเดียว
                selectinload(Sale.items).selectinload(SaleItem.variant),
                # ถ้าอยากได้ allocation (lot/qty ต่อ batch) ให้ joinedload batches ด้วย
                joinedload(Sale.items).joinedload(SaleItem.batches) if include_alloc else selectinload(Sale.items),
            )
            .order_by(Sale.sale_date.desc(), Sale.id.desc())
        )

        # นับจำนวนใบขาย (distinct sale.id) สำหรับสินค้านี้
        total = (
            db.session.query(func.count(distinct(Sale.id)))
            .join(Sale.items)
            .filter(SaleItem.product_id == product_id)
            .scalar()
        )

        sales_orders = q.offset(offset).limit(limit).all()

        # ถ้าต้องการรายละเอียดล็อต (lot_number/expiry) ของ allocation
        # แนะนำให้มี relationship ใน SaleItemBatch: batch = db.relationship("StockBatch")
        # ถ้ายังไม่มี คุณสามารถเพิ่ม แล้วค่อย joinedload(SaleItem.batches).joinedload(SaleItemBatch.batch)
        def _to_allocations(item: SaleItem):
            alloc = []
            for sib in item.batches:
                row = {
                    "batch_id": sib.batch_id,
                    "qty": int(sib.qty or 0),
                }
                # ถ้ามี relationship sib.batch ให้แสดง lot/expiry ด้วย
                if hasattr(sib, "batch") and sib.batch is not None:
                    row.update({
                        "lot_number": sib.batch.lot_number,
                        "expiry_date": sib.batch.expiry_date.isoformat() if sib.batch.expiry_date else None,
                    })
                alloc.append(row)
            return alloc

        data = []
        for s in sales_orders:
            # ในระบบคุณ 1 ใบ = 1 รายการ; แต่เผื่อหลายรายการจึงวน loop
            for it in s.items:
                data.append({
                    # header-level
                    "sale_id": s.id,
                    "sale_date": s.sale_date.isoformat() if s.sale_date else None,
                    "channel_id": s.channel_id,
                    "channel_name_at_sale": s.channel_name_at_sale,
                    "commission_percent_at_sale": s.commission_percent_at_sale,
                    "transaction_percent_at_sale": s.transaction_percent_at_sale,
                    "customer_name": s.customer_name,
                    "province": s.province,

                    # item-level (snapshot ตอนขาย)
                    "product_id": it.product_id,
                    "variant_id": it.variant_id,
                    "sale_mode_at_sale": it.sale_mode_at_sale,
                    "pack_size_at_sale": it.pack_size_at_sale,
                    "quantity_pack": it.quantity_pack,
                    "unit_price_at_sale": it.unit_price_at_sale,
                    "base_units": it.base_units,
                    "line_total": it.line_total,

                    # totals (ระดับบิล)
                    "subtotal": s.subtotal,
                    "shipping_fee": s.shipping_fee,
                    "shop_discount": s.shop_discount,
                    "platform_discount": s.platform_discount,
                    "coin_discount": s.coin_discount,
                    "vat_amount": s.vat_amount,
                    "commission_fee": s.commission_fee,
                    "transaction_fee": s.transaction_fee,
                    "customer_pay": s.customer_pay,
                    "seller_receive": s.seller_receive,

                    # allocations (ต่อใบ/ต่อ item)
                    "allocations": _to_allocations(it) if include_alloc else [],
                })

        result = {
            "data": data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit
            }
        }
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"❌ Unexpected error: {str(e)}"}), 500

#3. API DELETE - delete a sale order
@sale_bp.route("/<int:sale_id>", methods=["DELETE"])
def delete_sale(sale_id: int):
    try:
        force = request.args.get('force') in ('1','true','True')

        sale = (
            db.session.query(Sale)
            .options(
                joinedload(Sale.items)
                  .joinedload(SaleItem.batches)
                  .joinedload(SaleItemBatch.batch)
            )
            .get(sale_id)
        )
        if not sale:
            return jsonify({"error": "❌ Sale not found"}), 404

        restored = []

        with db.session.begin_nested():
            # 1) คืนสต็อกจาก allocations เดิม
            for item in sale.items:
                for sib in item.batches:
                    b = sib.batch
                    if not b:
                        return jsonify({"error": f"❌ Missing batch for SaleItemBatch #{sib.id}"}), 500

                    before = int(b.qty_remaining or 0)
                    add_qty = int(sib.qty or 0)
                    target  = before + add_qty

                    if target > int(b.qty_received or 0):
                        if not force:
                            return jsonify({
                                "error": "❌ Cannot restore stock: would exceed batch qty_received",
                                "conflict": {
                                    "batch_id": b.id,
                                    "lot_number": b.lot_number,
                                    "qty_received": int(b.qty_received or 0),
                                    "qty_remaining_before": before,
                                    "trying_to_add": add_qty,
                                    "would_be": target
                                },
                                "hint": "เรียกใหม่ด้วย ?force=1 เพื่อ cap ให้ไม่เกิน qty_received",
                            }), 409
                        add_qty = int(b.qty_received or 0) - before
                        target  = before + add_qty

                    b.qty_remaining = target
                    restored.append({
                        "batch_id": b.id,
                        "lot_number": b.lot_number,
                        "expiry_date": b.expiry_date.isoformat() if b.expiry_date else None,
                        "restored_qty": int(add_qty),
                        "qty_remaining_after": int(target)
                    })

            # 2) ลบ movement ที่อ้างใบขายนี้ทิ้งก่อน (กัน FK fail)
            db.session.query(StockMovement)\
                .filter(StockMovement.ref_sale_id == sale.id)\
                .delete(synchronize_session=False)

            # 3) ลบ sale (SaleItem/SaleItemBatch จะหายเพราะ cascade)
            db.session.delete(sale)

        db.session.commit()
        return jsonify({
            "message": "✅ Sale hard-deleted and stock restored",
            "sale_id": sale_id,
            "restored_allocations": restored
        }), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"❌ Database error: {str(e)}"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"❌ Unexpected error: {str(e)}"}), 500
    
#4. API GET detail - get sale detail by Id
@sale_bp.route("/detail/<int:sale_id>", methods=["GET"])
def get_sale_detail(sale_id: int):
    try:
        sale = (
            db.session.query(Sale)
            .options(
                # โหลดรายการในบิล (ปัจจุบันระบบคุณ 1 ใบ = 1 รายการ)
                joinedload(Sale.items)
                    .joinedload(SaleItem.variant)
                    .joinedload(ProductVariant.product),
                # โหลด allocations ของรายการ และ batch ที่ถูกตัด
                joinedload(Sale.items)
                    .joinedload(SaleItem.batches)
                    .joinedload(SaleItemBatch.batch),
                # ช่องทางร้าน (เอาชื่อกับ tier %)
                joinedload(Sale.channel).joinedload(SalesChannel.platform_tier),
            )
            .get(sale_id)
        )
        if not sale:
            return jsonify({"error": "❌ Sale not found"}), 404

        # item หลัก (ตามข้อกำหนด: 1 รายการ/บิล)
        item = sale.items[0] if sale.items else None

        # allocations (ตัดล็อตตาม FEFO ตอนขาย)
        allocations = []
        if item:
            for sib in item.batches:
                b = sib.batch  # StockBatch
                allocations.append({
                    "sale_item_batch_id": sib.id,
                    "batch_id": b.id if b else None,
                    "lot_number": b.lot_number if b else None,
                    "expiry_date": (b.expiry_date.isoformat() if (b and b.expiry_date) else None),
                    "qty": int(sib.qty or 0),
                })

        # header response
        detail = {
            "id": sale.id,
            "sale_date": sale.sale_date.isoformat() if sale.sale_date else None,
            "channel": {
                "id": sale.channel_id,
                "name": sale.channel_name_at_sale,
                "commission_percent": float(sale.commission_percent_at_sale or 0.0),
                "transaction_percent": float(sale.transaction_percent_at_sale or 0.0),
            },
            "customer_name": sale.customer_name,
            "province": sale.province,
            "note": getattr(sale, "note", None),

            # totals (คำนวณไว้แล้วตอนสร้าง/อัปเดต)
            "totals": {
                "subtotal": float(sale.subtotal or 0.0),
                "shipping_fee": float(sale.shipping_fee or 0.0),
                "shop_discount": float(sale.shop_discount or 0.0),
                "platform_discount": float(sale.platform_discount or 0.0),
                "coin_discount": float(sale.coin_discount or 0.0),
                "vat_amount": float(sale.vat_amount or 0.0),
                "commission_fee": float(sale.commission_fee or 0.0),
                "transaction_fee": float(sale.transaction_fee or 0.0),
                "customer_pay": float(sale.customer_pay or 0.0),
                "seller_receive": float(sale.seller_receive or 0.0),
            },
        }

        # item block (สำหรับ prefill form)
        if item:
            detail["item"] = {
                "id": item.id,
                "product_id": item.product_id,
                "variant_id": item.variant_id,
                "sale_mode_at_sale": item.sale_mode_at_sale,
                "pack_size_at_sale": int(item.pack_size_at_sale or 0),
                "quantity_pack": int(item.quantity_pack or 0),
                "unit_price_at_sale": float(item.unit_price_at_sale or 0.0),
                "base_units": int(item.base_units or 0),
                "line_total": float(item.line_total or 0.0),
            }
        else:
            detail["item"] = None

        detail["allocations"] = allocations

        return jsonify(detail), 200

    except Exception as e:
        return jsonify({"error": f"❌ Failed to fetch sale detail: {str(e)}"}), 500

#5. API PATCH - แก้ไข sale แค่ Header ห้ามแก้จำนวน quantity
@sale_bp.route("/<int:sale_id>", methods=["PATCH"])
def patch_sale_header(sale_id: int):
    try:
        p = request.form

        sale = (
            db.session.query(Sale)
            .options(joinedload(Sale.items))
            .get(sale_id)
        )
        if not sale:
            return jsonify({"error": "❌ Sale not found"}), 404

        # header updates
        if "sale_date" in p:
            sale.sale_date = datetime.fromisoformat(p.get("sale_date"))

        for f in ("customer_name","province","note"):
            if f in p:
                setattr(sale, f, p.get(f) or None)

        # discounts / fees / unit price (ถ้าต้องการแก้)
        def fnum(k): 
            v = p.get(k); 
            return float(v) if v not in (None,"") else None

        # อนุญาตแก้ราคาต่อแพ็ค? (แล้วแต่ policy)
        # สมมติเก็บไว้ที่ item แถวเดียวของใบนี้
        item = sale.items[0] if sale.items else None
        if item and "unit_price_at_sale" in p:
            item.unit_price_at_sale = float(p.get("unit_price_at_sale"))
            item.line_total = item.unit_price_at_sale * item.quantity_pack

        for k in ("shipping_fee","shop_discount","platform_discount","coin_discount","vat_amount"):
            val = fnum(k)
            if val is not None:
                setattr(sale, k, val)

        # เปลี่ยนช่องทางร้าน → re-snapshot %
        if "channel_id" in p:
            channel = db.session.get(SalesChannel, int(p.get("channel_id")))
            if not channel:
                return jsonify({"error": "❌ SalesChannel not found"}), 404
            tier = channel.platform_tier
            sale.channel_id = channel.id
            sale.channel_name_at_sale = channel.channel_name
            sale.commission_percent_at_sale  = float(getattr(tier, "commission_percent", 0.0) or 0.0)
            sale.transaction_percent_at_sale = float(getattr(tier, "transaction_percent", 0.0) or 0.0)

        # recalc totals
        subtotal = 0.0
        for it in sale.items:
            subtotal += float(it.line_total or 0.0)
        sale.subtotal = round(subtotal, 2)

        disc = float(sale.shop_discount or 0) + float(sale.platform_discount or 0) + float(sale.coin_discount or 0)
        pre_vat = sale.subtotal - disc + float(sale.shipping_fee or 0)
        vat = float(sale.vat_amount or 0)

        sale.commission_fee  = round(sale.subtotal * (float(sale.commission_percent_at_sale or 0) / 100.0), 2)
        sale.transaction_fee = round(sale.subtotal * (float(sale.transaction_percent_at_sale or 0) / 100.0), 2)
        sale.customer_pay    = round(pre_vat + vat, 2)
        sale.seller_receive  = round(sale.customer_pay - sale.commission_fee - sale.transaction_fee, 2)

        db.session.commit()
        return jsonify({"message": "✅ Sale updated (header)"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"❌ Failed to patch sale: {str(e)}"}), 500