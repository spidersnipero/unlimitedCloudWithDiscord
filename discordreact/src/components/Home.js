import React from "react";
import UploadFile from "./UploadFile";
import AllFiles from "./AllFiles";
// import botstrap
import "bootstrap/dist/css/bootstrap.min.css";

const Home = () => {
  return (
    <div
      class=" justify container my-5"
      style={{ background: "#112D4E", color: "white", borderRadius: "10px" }}
    >
      <div className="container">
        <div className="py-3">
          <UploadFile />
        </div>
        <div className="py-3">
          <AllFiles />
        </div>
      </div>
    </div>
  );
};

export default Home;
