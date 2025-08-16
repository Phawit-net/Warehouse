"use client";
import Modal from "@/components/Modal";
import TextInput from "@/components/TextInput";
import axios from "axios";
import { fetcher } from "@/lib/fetcher";
import React, { useCallback, useState } from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import useSWR from "swr";
import { salesChannelHeaderColumn } from "@/constant";
import IconsButton from "@/components/IconsButton";
import TextArea from "@/components/TextArea";
import StepProgress from "@/components/StepProgress";
import RadioButton from "@/components/RadioButton";
import RadioButtonType from "./RadioButtonType";

const Form = () => {
  const {
    reset,
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PlatformFormData>({
    defaultValues: {},
  });
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;
  const [tiers, setTiers] = useState([]);

  const buildFormData = useCallback((data: PlatformFormData): FormData => {
    const formData = new FormData();
    formData.append("channel_name", data.channel_name);
    formData.append("store_desc", data.store_desc);
    formData.append("platform_tier_id", data.platform_tier_id.toString());
    return formData;
  }, []);

  const onSubmit: SubmitHandler<PlatformFormData> = async (
    data: PlatformFormData
  ) => {
    const formData = buildFormData(data);
    try {
      await axios.post("http://localhost:5001/api/channel", formData);
      reset();
    } catch (error) {
      console.error("❌ Upload failed:", error);
      // TODO: Add toast / error UI
    }
  };

  const handleNext = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    setCurrentStep((prev) => (prev < totalSteps ? prev + 1 : prev));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => (prev > 1 ? prev - 1 : prev));
  };

  const getPlatformTeir = async (platform: string) => {
    try {
      const res = await axios.get(
        `http://localhost:5001/api/platforms/${platform}`
      );
      setTiers(res.data); // เก็บ tiers ไว้ใช้ Step 2
    } catch (err) {
      console.error("Error fetching tiers", err);
    }
  };

  const Step1Form = ({ register, errors, control }: any) => (
    <div>
      <h2 className="text-xl font-bold text-gray-700">Step 1: ข้อมูลทั่วไป</h2>
      <p className="mt-2 text-gray-600 mb-6">
        Please enter your name and email to get started.
      </p>
      <div className="space-y-4">
        <TextInput
          placeholder="ชื่อร้านค้า"
          name="channel_name"
          label="ชื่อร้านค้า"
          register={register}
          type="text"
        />
        <TextArea
          name="store_desc"
          label="คำอธิบายร้านค้า"
          register={register}
          placeholder="คำอธิบายร้านค้า"
        />
        <Controller
          name={`platform`}
          control={control}
          render={({ field }) => (
            <RadioButton
              label="ช่องทาง online"
              options={["Shopee", "Tiktok", "Lazada"]}
              value={field.value}
              onChange={async (value) => {
                field.onChange(value);
                getPlatformTeir(value);
              }}
            />
          )}
        />
      </div>
    </div>
  );

  const Step2Form = ({ register, errors }: any) => (
    <div>
      <h2 className="text-xl font-bold text-gray-700">
        Step 2: เลือกประเภทร้าน
      </h2>
      <div className="space-y-4">
        <Controller
          name={`platform_tier_id`}
          control={control}
          render={({ field }) => (
            <RadioButtonType
              label="ช่องทาง online"
              options={tiers}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1Form register={register} errors={errors} control={control} />
        );
      case 2:
        return <Step2Form register={register} errors={errors} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-12 bg-white">
      <StepProgress currentStep={currentStep} totalSteps={totalSteps} />
      <form id="add-sale-channel" onSubmit={handleSubmit(onSubmit)}>
        {renderStepContent()}
        <div className="mt-6 flex justify-center space-x-4">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="px-6 py-2 rounded-xl bg-gray-200 text-gray-800 font-medium transition-all duration-300 disabled:opacity-50 hover:bg-gray-300"
          >
            Previous
          </button>
          {currentStep === totalSteps ? (
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-green-600 text-white font-medium transition-all duration-300 hover:bg-green-700"
            >
              Submit
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => handleNext(e)}
              className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-medium transition-all duration-300 hover:bg-indigo-700"
            >
              Next
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default Form;
