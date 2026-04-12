import { useState } from "react";
import { isLoggedIn } from "@/lib/store";
import Login from "./Login";
import Dashboard from "./Dashboard";

const Index = () => {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn);

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  return <Dashboard onLogout={() => setLoggedIn(false)} />;
};

export default Index;
