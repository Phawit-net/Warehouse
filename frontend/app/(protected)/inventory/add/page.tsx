import BackButton from "@/components/BackButton";
import Form from "@/feature/product/component/Form";

const AddPage = () => {
  return (
    <div className="bg-[#f7f7f7] min-h-dvh p-6 ">
      <div className="flex justify-between items-center my-3">
        <h2 className="text-3xl font-semibold">เพิ่มสินค้า</h2>
        <BackButton text="Back to Inventory" fallback="/inventory" />
      </div>
      <Form mode="add" />
    </div>
  );
};

export default AddPage;
