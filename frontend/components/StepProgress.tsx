import React, { useState } from "react";

type Props = {
  currentStep: number;
  totalSteps: number;
};

const headerStep = [
  { page: 1, label: "ข้อมูลทั่วไป" },
  { page: 2, label: "ประเภทร้านค้า" },
];

const StepProgress = ({ currentStep, totalSteps }: Props) => {
  return (
    <div className="flex items-center w-full my-8">
      {/* Loop through each step to create the progress indicators */}
      {headerStep.map((item, index) => {
        const stepNumber = index + 1;
        const isCurrent = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <React.Fragment key={index}>
            {/* Step circle container */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  flex items-center justify-center 
                  w-full h-10 rounded-full px-3
                  transition-all duration-300
                  ${isCompleted ? "border-1 border-gray-300 text-gray-400" : ""}
                  ${isCurrent ? "border-1 border-[#f49b50]" : ""}
                  ${
                    !isCompleted && !isCurrent
                      ? "border-1 border-gray-300 text-gray-400"
                      : ""
                  }
                `}
              >
                {/* Step number or a checkmark for completed steps */}
                {isCompleted ? (
                  <div className="flex font-medium items-center justify-center gap-2">
                    <span className=" w-5 h-5 flex items-center justify-center border-1 border-[#f49b50] bg-[#f49b50] rounded-full text-[#f49b50]">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                    <span>{item.label}</span>
                  </div>
                ) : (
                  <div className="flex font-medium items-center justify-center gap-2">
                    <span
                      className={`w-5 h-5 flex items-center justify-center border-1 rounded-full ${
                        isCurrent
                          ? " border-[#f49b50]  text-[#f49b50]"
                          : "border-gray-300 text-gray-400"
                      }`}
                    >
                      {item.page}
                    </span>
                    <span>{item.label}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress line between steps */}
            {index < totalSteps - 1 && (
              <div
                className={`
                  flex-1 border-t-1 transition-all duration-300
                `}
              ></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepProgress;
