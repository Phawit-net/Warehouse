# seed_data.py
from models import db, Platform, PlatformTier

def seed_platforms():
    platforms_data = [
        {
            "name": "Shopee",
            "tiers": [
                {"name": "Normal", "commission_percent": 8.56, "transaction_percent": 3.21},
                {"name": "YellowFlag", "commission_percent": 6.42, "transaction_percent": 3.21},
                {"name": "Mall", "commission_percent": 8.56, "transaction_percent": 3.21},
            ]
        },
        {
            "name": "Lazada",
            "tiers": [
                {"name": "Normal", "commission_percent": 4.28, "transaction_percent": 3.21},
            ]
        },
        {
            "name": "TikTok",
            "tiers": [
                {"name": "Normal", "commission_percent": 7.35, "transaction_percent": 3.21},
            ]
        }
    ]

    for p in platforms_data:
        platform = Platform.query.filter_by(name=p["name"]).first()
        if not platform:
            platform = Platform(name=p["name"])
            db.session.add(platform)
            db.session.flush()

        for tier in p["tiers"]:
            exists = PlatformTier.query.filter_by(platform_id=platform.id, name=tier["name"]).first()
            if not exists:
                db.session.add(PlatformTier(
                    platform_id=platform.id,
                    name=tier["name"],
                    commission_percent=tier["commission_percent"],
                    transaction_percent=tier["transaction_percent"]
                ))

    db.session.commit()
    print("✅ Platforms & tiers seeded successfully!")
