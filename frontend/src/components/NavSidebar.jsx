import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    Box,
    Button,
} from "@mui/material";
import { Home } from "@mui/icons-material";
import CellTowerIcon from "@mui/icons-material/CellTower";
import BarChartIcon from "@mui/icons-material/BarChart";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import { useNavigate } from "react-router-dom";

const DRAWER_WIDTH = 240;

const NavSidebar = () => {
    const navigate = useNavigate();

    const logoutUser = () => {
        localStorage.clear();
        navigate("/login");
    };

    const role = localStorage.getItem("role");
    const isAdmin = role && role.includes("admin");

    const navItems = [
        { label: "Home", icon: <Home />, path: "/home" },
        { label: "Devices", icon: <CellTowerIcon />, path: "/devices" },
        { label: "Dashboard", icon: <BarChartIcon />, path: "/dashboard" },
        { label: "Profile", icon: <PersonIcon />, path: "/profile" },
        ...(isAdmin ? [{ label: "Manage Users", icon: <ManageAccountsIcon />, path: "/manage-users" }] : []),
    ];

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: DRAWER_WIDTH,
                flexShrink: 0,
                "& .MuiDrawer-paper": {
                    width: DRAWER_WIDTH,
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                },
            }}
        >
            <Box sx={{ overflow: "auto", flexGrow: 1 }}>
                <List>
                    {navItems.map(({ label, icon, path }) => (
                        <ListItem key={label} disablePadding>
                            <ListItemButton onClick={() => navigate(path)}>
                                <ListItemIcon>{icon}</ListItemIcon>
                                <ListItemText primary={label} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>
            <Divider />
            <Box sx={{ p: 2 }}>
                <Button variant="outlined" startIcon={<LogoutIcon />} onClick={logoutUser} fullWidth>
                    Logout
                </Button>
            </Box>
        </Drawer>
    );
};

export default NavSidebar;
