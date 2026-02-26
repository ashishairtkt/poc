import { Outlet, Link } from "react-router-dom";
import { Header } from "../components/header/header";

const MainLayout = () => {
    return (
        <>
            <Header />
            <Outlet />
        </>
    );
};

export default MainLayout;