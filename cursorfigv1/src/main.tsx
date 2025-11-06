
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  import { initializeApp } from "firebase/app";

  const firebaseConfig = {
    apiKey: "AIzaSyB9UsZ09n5z60Sw_YcXk23VDJclGeS_yhg",
    authDomain: "budgetbubb.firebaseapp.com",
    projectId: "budgetbubb",
    storageBucket: "budgetbubb.firebasestorage.app",
    messagingSenderId: "36873380563",
    appId: "1:36873380563:web:d9f5a19a7cc64482f3aa26",
    measurementId: "G-TWC2S5J1VH"
  };

  // Initialize Firebase
  initializeApp(firebaseConfig);

  createRoot(document.getElementById("root")!).render(<App />);
  