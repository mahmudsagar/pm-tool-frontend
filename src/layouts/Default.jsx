import ParallelRote from "@/BetterRouter/ParallelRoute";
import { Outlet } from "react-router-dom";
import Header from "./elements/header";
import Sidebar from "./elements/sidebar";

const Default = ({ children }) => {
    return (
        <>
            <div className="flex h-screen border-collapse overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto overflow-x-hidden bg-secondary/10 pb-1">
                    <Header />
                    {children}
                    <Outlet />
                    <ParallelRote />
                </main>
            </div>
        </>
    );
};

export default Default;