import React, { useEffect } from "react";
import { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const AllFiles = () => {
  const [files, setFiles] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getfiles = async () => {
    const res = await fetch("http://localhost:3001/gettexts");
    const data = await res.json();
    console.log(data);
    var modifiedData = [];

    for (var i = 0; i < data.length; i++) {
      var temp = "";
      while (!data[i].startsWith("file_name:")) {
        temp += data[i] + "\n";
        i++;
      }
      if (data[i].startsWith("file_name:")) {
        temp += data[i];
      }
      modifiedData.push(temp);
    }
    setFiles(modifiedData);
    setIsLoading(false);
  };
  useEffect(() => {
    getfiles();
  }, []);
  function downloadFile(words) {
    setIsDownloading(true);
    fetch("http://localhost:3001/downloadfile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ words }),
    })
      .then(() => {
        setIsDownloading(false);
        alert("File Downloaded");
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }
  if (isLoading) {
    return <h1>Loading...</h1>;
  }

  return (
    <div>
      <h1 className="">All Your Files</h1>
      {isDownloading && <h4>Downloading...</h4>}
      {files.length === 0 && <h2>No files to show</h2>}
      {files.map((file, index) => {
        const words = file.split("\n").reverse();
        var temp = words[0];
        words[0] = words[1];
        words[1] = temp;
        console.log(words);
        return (
          <>
            <div
              key={index}
              className="mb-4 d-flex flex-row justify-content-between border-2 w-1/2 border  rounded p-2"
            >
              <div>
                <h5>{words[0].split(":")[1]}</h5>
                <p>{words[1]}</p>
              </div>
              {isDownloading ? (
                <div>
                  <button className="btn btn-success" disabled>
                    <span className="material-icons">download</span>
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    className="btn btn-success"
                    onClick={() => downloadFile(words)}
                  >
                    <span className="material-icons">download</span>
                  </button>
                </div>
              )}
            </div>
          </>
        );
      })}
    </div>
  );
};

export default AllFiles;
