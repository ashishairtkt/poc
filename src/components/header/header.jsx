import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { HeaderNavigationBase } from "@/components/application/app-navigation/header-navigation";


export const Header = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
        navigate("/auth/login", { replace: true });
    };

    const navItems = [
        { label: "Home", href: "/", current: location.pathname === "/" },
        {
            label: "Dashboard",
            href: "/dashboard",
            current: location.pathname.startsWith("/dashboard"),

        },

    ];


    return (
        <HeaderNavigationBase
            onSignOut={handleLogout}
            user={user}
            activeUrl={location.pathname}
            items={navItems}
        />
    );

};
