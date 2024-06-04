import { Routes, Route } from "react-router-dom";
import UploadFile from "./components/UploadFile";
import AllFiles from "./components/AllFiles";
import Home from "./components/Home";

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/uploadfile" element={<UploadFile />} />
        <Route path="/allfiles" element={<AllFiles />} />
      </Routes>
    </div>
  );
}

export default App;
