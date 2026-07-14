import { useState, useEffect, useMemo } from "react";

import {
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Container,
    Typography,
    Divider,
    Box,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { MaterialReactTable, useMaterialReactTable } from "material-react-table";
import AddDeviceForm from "../components/AddDeviceForm";
import PageHeader from "../components/PageHeader";

const DeviceTable = () => {
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
    const [deviceToRemove, setDeviceToRemove] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    const fetchDevices = async () => {
        try {
            const response = await fetch("/api/devices");
            if (!response.ok) {
                throw new Error(`Failed to fetch devices: ${response.status}`);
            }
            const data = await response.json();
            setDevices(data);
        } catch (error) {
            console.error("Error fetching devices:", error);
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    const handleScheduleOpen = (device) => {
        setSelectedDevice(device);
        setIsScheduleDialogOpen(true);
        setSelectedAction("schedule");
    };

    const handleScheduleClose = () => {
        setIsScheduleDialogOpen(false);
        setSelectedAction(null);
        setSelectedDevice(null);
    };

    const handleRemoveOpen = (device) => {
        setDeviceToRemove(device);
        setIsRemoveDialogOpen(true);
        setDeleteError(null);
    }

    const handleRemoveClose = () => {
        if(isDeleting) return; // Prevent closing the dialog while deleting
        setIsRemoveDialogOpen(false);
        setDeviceToRemove(null);
        setDeleteError(null);
    }

    const handleRemoveConfirm = async () => {
        if (!deviceToRemove) return;
        console.log("Attempting to delete:", deviceToRemove._id); // debugging log
        setIsDeleting(true);
        try {
            const response = await fetch(`api/device/${deviceToRemove._id.$oid}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                throw new Error(`Failed to delete device: ${response.status}`);
            }
            // Refresh the device list after deletion
            await fetchDevices();
            setIsRemoveDialogOpen(false);
            setDeviceToRemove(null);
        } catch (error) {
            console.error("Error deleting device:", error);
            setDeleteError("Failed to delete device.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleAction = (action, device) => {
        switch (action) {
            case "schedule":
                handleScheduleOpen(device);
                break;
            case "edit":
                // Handle edit action
                break;
            case "remove":
                handleRemoveOpen(device);
                break;
            default:
                break;
        }
    };

    const columns = useMemo(
        () => [
            { accessorKey: "deviceName", header: "Device Name" },
            { accessorKey: "deviceSlNo", header: "Serial Number" },
            { accessorKey: "deviceType", header: "Device Type" },
            { accessorKey: "hwType", header: "Hardware Type" },
            { accessorKey: "site", header: "Site" },
            { accessorKey: "group", header: "Group" },
            { accessorKey: "owner", header: "Owner" },
            {
                id: "connection",
                header: "Connection",
                accessorFn: (row) => {
                    const type = row.connectivityType || "-";
                    const ip = row.ip || "-";
                    const port = row.port || "-";
                    return `${type} | ${ip}:${port}`;
                },
            },
        ],
        [],
    );

    const table = useMaterialReactTable({
        columns,
        data: devices,
        enableRowActions: true,
        positionActionsColumn: "last",
        muiTableContainerProps: {},
        muiTablePaperProps: {
            elevation: 0,
        },
        renderTopToolbarCustomActions: () => (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddDialogOpen}>
                Add Device
            </Button>
        ),
        renderRowActionMenuItems: ({ row, closeMenu }) => [
            <MenuItem
                key="schedule"
                onClick={() => {
                    handleAction("schedule", row.original);
                    closeMenu();
                }}
            >
                Schedule
            </MenuItem>,
            <MenuItem
                key="edit"
                onClick={() => {
                    handleAction("edit", row.original);
                    closeMenu();
                }}
            >
                Edit
            </MenuItem>,
            <MenuItem
                key="remove"
                onClick={() => {
                    handleAction("remove", row.original);
                    closeMenu();
                }}
            >
                Remove
            </MenuItem>,
        ],
    });

    const handlePerformAction = async () => {
        if (!selectedDevice) return;
        try {
            switch (selectedAction) {
                case "schedule":
                    // Perform schedule action with selectedDevice._id
                    console.log(`Scheduled action for device ${selectedDevice._id}`);
                    break;
                default:
                    break;
            }
            handleScheduleClose();
        } catch (error) {
            console.error("Error performing action:", error);
        }
    };

    const handleAddDialogOpen = () => {
        setIsAddDialogOpen(true);
    };

    const handleAddDialogClose = () => {
        setIsAddDialogOpen(false);
    };

    const handleAddDeviceSuccess = () => {
        fetchDevices();
    };

    return (
        <Container maxWidth={false} disableGutters>
            <PageHeader title="Devices" breadcrumbItems={["Home", "Devices"]} />
            <MaterialReactTable table={table} />

            <Dialog open={isScheduleDialogOpen} onClose={handleScheduleClose}>
                <DialogTitle>Schedule Action</DialogTitle>
                <DialogContent>
                    {/* Add content for scheduling here */}
                    Schedule dialog content...
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleScheduleClose}>Cancel</Button>
                    <Button onClick={handlePerformAction} color="primary">
                        Schedule
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={isRemoveDialogOpen} onClose={handleRemoveClose}>
                <DialogTitle>Confirm Remove</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to remove the device {deviceToRemove?.deviceName}?
                    </Typography>
                    {deleteError && (
                        <Typography color="error" variant="body2">
                            {deleteError}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleRemoveClose} disabled={isDeleting}>
                        Cancel
                    </Button>
                    <Button onClick={handleRemoveConfirm}
                            color="primary"
                            disabled={isDeleting}>
                        {isDeleting ? "Removing..." : "Remove"}
                    </Button>
                </DialogActions>
            </Dialog>

            <AddDeviceForm
                open={isAddDialogOpen}
                onClose={handleAddDialogClose}
                onSuccess={handleAddDeviceSuccess}
            />
        </Container>
    );
};

export default DeviceTable;
