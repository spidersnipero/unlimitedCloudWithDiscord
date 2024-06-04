import React from "react";
import { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const UploadFile = () => {
  const [file, setFile] = useState(null);
  const [isUplaoding, setIsUploading] = useState(false);

  const handleForm = async (e) => {
    e.preventDefault();
    if (file == null) return;
    setIsUploading(true);
    const data = new FormData();
    data.append("file", file);
    console.log(file);
    if (file == null) return;
    const res = await fetch("http://localhost:3001/sendfile", {
      method: "POST",
      body: data,
    })
      .then((res) => res.json())
      .then((res) => {
        setIsUploading(false);
        return res;
      })
      .then(() => {
        window.location.reload();
      });

    console.log(res);
  };
  const handleChangeFile = (e) => {
    console.log(e.target.files[0]);
    setFile(e.target.files[0]);
  };
  return (
    <div className="App" onSubmit={handleForm}>
      <h1>Upload File</h1>
      {isUplaoding ? (
        <h3>Uploading...</h3>
      ) : (
        <form className="input-group">
          <input
            type="file"
            name="file"
            className="form-control"
            onChange={handleChangeFile}
          />
          <button className="input-group-text" type="submit">
            Submit
          </button>
        </form>
      )}
    </div>
  );
};

export default UploadFile;
