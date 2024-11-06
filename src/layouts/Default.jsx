import ParallelRote from "@/BetterRouter/ParallelRoute";
import { Outlet } from "react-router-dom";
import Header from "./elements/header";
import Sidebar from "./elements/sidebar";
import { useState } from "react";

const Default = ({ children }) => {
    const [topMenu, setTopMenu] = useState('')

    return (
        <>
            <div className="flex h-screen border-collapse overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto overflow-x-hidden bg-secondary/10 pb-1">
                    <Header topMenu={topMenu} />
                    {children}
                    <Outlet context={[topMenu, setTopMenu]} />
                    <ParallelRote />
                </main>
            </div>
        </>
    );
};

export default Default;