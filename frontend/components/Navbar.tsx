import React from "react";
import Image from "next/image";
import UserAvatarMenu from "./UserAvatarMenu";

const Navbar = () => {
  return (
    <div className="flex border-b-1 px-5 py-3 justify-end">
      <UserAvatarMenu />
    </div>
  );
};

export default Navbar;
