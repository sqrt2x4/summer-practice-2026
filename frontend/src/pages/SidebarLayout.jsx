import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import NavSidebar from "../components/NavSidebar";

export function SidebarLayout() {
    return (
        <Box sx={{ display: "flex" }}>
            <NavSidebar />
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                <Outlet />
            </Box>
        </Box>
    );
}
