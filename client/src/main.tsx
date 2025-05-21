import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.title = "SmartCart - Intelligent Shopping Assistant";

createRoot(document.getElementById("root")!).render(<App />);
