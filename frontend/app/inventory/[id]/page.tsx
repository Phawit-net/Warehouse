"use client";
import Form from "@/feature/newProduct/component/Form";
import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const EditPage = () => {
  const [product, setProduct] = useState<Products | null>(null);
  const params = useParams<{ id: string }>();

  useEffect(() => {
    if (!params.id) return;
    axios
      .get(`http://localhost:5001/api/inventory/${params.id}`)
      .then((res) => setProduct(res.data))
      .catch((err) => console.error(err));
  }, [params.id]);

  if (!product) return <div className="p-6 text-gray-400">Loading...</div>;

  return (
    <div className="bg-[#fff0e4] h-full p-3 ">
      <div className="flex justify-between items-center my-3">
        <h2 className="text-3xl font-semibold mx-3">แก้ไขสินค้า</h2>
        <button
          type="submit"
          form="add-product-form"
          className="bg-[#f49b50] text-white p-2 rounded"
        >
          Save & Publish
        </button>
      </div>
      <Form mode="edit" initialData={product} />
    </div>
  );
};

export default EditPage;
