import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../utils/api";
import {
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Container,
    Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { MaterialReactTable, useMaterialReactTable } from "material-react-table";
import AddDeviceForm from "../components/AddDeviceForm";
import PageHeader from "../components/PageHeader";
import ScheduleForm from "../components/ScheduleForm";

const DeviceTable = () => {
    const [devices, setDevices] = useState([]);
    //SCHEDULE
    const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false);
    const [deviceToSchedule, setDeviceToSchedule] = useState(null);
    // ADD
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [deviceToEdit, setDeviceToEdit] = useState(null);
    //REMOVE
    const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
    const [deviceToRemove, setDeviceToRemove] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    const fetchDevices = async () => {
        try {
            const response = await apiFetch("/devices");
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

    const handleScheduleFormOpen = (device) => {
        setDeviceToSchedule(device);
        setIsScheduleFormOpen(true);
    };

    const handleScheduleFormClose = () => {
        setIsScheduleFormOpen(false);
        setDeviceToSchedule(null);
    };

    const handleScheduleSuccess = () => {
        fetchDevices();
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
        setIsDeleting(true);
        try {
            const response = await apiFetch(`/device/${deviceToRemove._id.$oid}`, {
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

    const handleEditOpen = (device) => {
    setDeviceToEdit(device);
    setIsEditDialogOpen(true);
    };

    const handleEditClose = () => {
        setIsEditDialogOpen(false);
        setDeviceToEdit(null);
    };

    const handleEditSuccess = () => {
        fetchDevices();
    };

    const handleAction = (action, device) => {
        switch (action) {
            case "schedule":
                handleScheduleFormOpen(device);
                break;
            case "edit":
                handleEditOpen(device);
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

            <AddDeviceForm
                open={isEditDialogOpen}
                onClose={handleEditClose}
                onSuccess={handleEditSuccess}
                device={deviceToEdit}
            />

            <ScheduleForm
            open={isScheduleFormOpen}
            onClose={handleScheduleFormClose}
            onSuccess={handleScheduleSuccess}
            device={deviceToSchedule}
        />
        </Container>
    );
};

export default DeviceTable;
