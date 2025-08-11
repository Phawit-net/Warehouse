import Form from "@/feature/product/component/Form";

const AddPage = () => {
  return (
    <div className="bg-[#fff0e4] h-full p-3 ">
      <div className="flex justify-between items-center my-3">
        <h2 className="text-3xl font-semibold mx-3">เพิ่มสินค้า</h2>
        <button
          type="submit"
          form="add-product-form"
          className="bg-[#f49b50] text-white p-2 rounded"
        >
          Save & Publish
        </button>
      </div>
      <Form mode="add" />
    </div>
  );
};

export default AddPage;
