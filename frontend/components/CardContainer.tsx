import React from "react";

type Props = {
  children: React.ReactNode;
};

const CardContainer = ({ children }: Props) => {
  return (
    <div className="bg-white border-1 rounded-sm shadow-md p-3">{children}</div>
  );
};

export default CardContainer;
