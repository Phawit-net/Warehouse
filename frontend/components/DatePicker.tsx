"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ControllerRenderProps } from "react-hook-form";

type Props = {
  label: string;
  field: ControllerRenderProps<any, string>;
  name: string;
  margin?: number;
  isLabel?: boolean;
};

export function DatePicker({
  label,
  field,
  margin = 5,
  isLabel = true,
}: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <div
      className={`flex flex-col mb-${margin} ${isLabel ? "gap-1" : "gap-0"}`}
    >
      {isLabel && <label className="text-md font-semibold">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "h-[40px] shadow-none justify-start text-md font-normal border-none rounded bg-[#fff0e4] hover:bg-[#fff0e4] focus:outline-none text-gray-500 focus:ring-2 focus:ring-[#ffc596]"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {field.value ? (
              format(field.value, "dd/MM/yyyy")
            ) : (
              <span>เลือกวันที่</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={field.value}
            onSelect={field.onChange}
            captionLayout="dropdown"
            modifiersClassNames={{
              selected: "rounded",
              today: "bg-[#f49b50] rounded-md",
            }}
            locale={th}
            labels={thaiLabels}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

const thaiLabels = {
  labelMonthDropdown: () => "เลือกเดือน", // ข้อความสำหรับ dropdown เดือน
  labelYearDropdown: () => "เลือกปี", // ข้อความสำหรับ dropdown ปี
  // คุณต้องใส่ชื่อเดือนเป็นภาษาไทยทั้งหมดที่นี่
  months: [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ],
  // วันในสัปดาห์
  weekdaysShort: ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"],
  // ... อื่นๆ ที่เกี่ยวข้องกับ DayPicker
};
