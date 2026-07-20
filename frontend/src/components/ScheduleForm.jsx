import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
    Alert,
    Box,
    Button,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    Grid,
    Link,
    Radio,
    RadioGroup,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DockedDialog from "./DockedDialog";

const initialFormData = {
    startDate: "",
    powerOnTime: "",
    powerOffTime: "",
    recurrence: "everyday",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKEND_DAYS = ["Sat", "Sun"];

const RECURRENCE_TOOLTIPS = {
    workdays: "Applies Monday through Friday",
    everyday: "Applies every day of the week",
    weekends: "Applies Saturday and Sunday",
};

const isDayActive = (day, recurrence) => {
    if (recurrence === "everyday") return true;
    const isWeekendDay = WEEKEND_DAYS.includes(day);
    if (recurrence === "weekends") return isWeekendDay;
    if (recurrence === "workdays") return !isWeekendDay;
    return false;
};

/**
 * @param {{ open: boolean, onClose: () => void, onSuccess?: () => void, device: object | null }} props
 */
const ScheduleForm = ({ open, onClose, onSuccess, device }) => {
    const [tab, setTab] = useState(0);
    const [formData, setFormData] = useState({ ...initialFormData });
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasExistingSchedule, setHasExistingSchedule] = useState(false);

    const deviceId = device?._id?.$oid || device?._id;

    useEffect(() => {
        if (!open || !deviceId) return;

        const fetchSchedule = async () => {
            setIsLoading(true);
            setError("");
            try {
                const response = await fetch(`/api/schedule/${deviceId}`);
                if (!response.ok) {
                    throw new Error(`Failed to load schedule: ${response.status}`);
                }
                const data = await response.json();
                if (data) {
                    setFormData({
                        startDate: data.startDate,
                        powerOnTime: data.powerOnTime,
                        powerOffTime: data.powerOffTime,
                        recurrence: data.recurrence,
                    });
                    setHasExistingSchedule(true);
                } else {
                    setFormData({ ...initialFormData });
                    setHasExistingSchedule(false);
                }
            } catch (err) {
                setError(err.message || "Failed to load schedule.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchSchedule();
    }, [open, deviceId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (error) setError("");
        setFormData({ ...formData, [name]: value });
    };

    const handleDialogClose = () => {
        if (isSubmitting) return;
        setError("");
        setFormData({ ...initialFormData });
        setHasExistingSchedule(false);
        setTab(0);
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        try {
            const url = hasExistingSchedule ? `/api/schedule/${deviceId}` : "/api/schedule";
            const method = hasExistingSchedule ? "PUT" : "POST";
            const body = hasExistingSchedule ? formData : { ...formData, device: deviceId };

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }

            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            setError(err.message || "Failed to save schedule.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveSchedule = async () => {
        setIsSubmitting(true);
        setError("");
        try {
            const response = await fetch(`/api/schedule/${deviceId}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                throw new Error(`Failed to remove schedule: ${response.status}`);
            }
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            setError(err.message || "Failed to remove schedule.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <DockedDialog open={open} onClose={handleDialogClose}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)}>
                    <Tab label="Recurring Scheduler" />
                    <Tab label="Calendar Scheduler" disabled />
                </Tabs>
            </Box>

            {tab === 0 && (
                <>
                    <DialogTitle>Recurring Schedule for {device?.deviceName}</DialogTitle>
                    <DialogContent dividers>
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        <Stack component="form" id="schedule-form" onSubmit={handleSubmit} spacing={3} sx={{ mt: 1, width: 480 }}>
                            <Grid container spacing={2} alignItems="flex-start">
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                        Start Date *
                                    </Typography>
                                    <TextField
                                        name="startDate"
                                        type="date"
                                        variant="standard"
                                        value={formData.startDate}
                                        onChange={handleChange}
                                        InputLabelProps={{ shrink: true }}
                                        fullWidth
                                        required
                                        disabled={isLoading}
                                    />
                                </Grid>
                                <Grid item xs={7} sx={{ textAlign: "right" }}>
                                    <Link
                                        component="button"
                                        type="button"
                                        underline="hover"
                                        variant="body2"
                                        display="block"
                                        sx={{ color: "#f06292", fontWeight: 500 }}>
                                        Set recurrence end date
                                    </Link>
                                    <Typography
                                        variant="caption"
                                        display="block"
                                        sx={{ color: "#f06292", mt: 0.5 }}
                                    >
                                        Default: Never
                                    </Typography>
                                </Grid>
                            </Grid>

                           <Grid container spacing={3}>
                                <Grid item>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                        Power Off Time *
                                    </Typography>
                                    <TextField
                                        name="powerOffTime"
                                        type="time"
                                        variant="standard"
                                        value={formData.powerOffTime}
                                        onChange={handleChange}
                                        sx={{ width: 180 }}
                                        required
                                        disabled={isLoading}
                                    />
                                </Grid>
                                <Grid item>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                        Power On Time *
                                    </Typography>
                                    <TextField
                                        name="powerOnTime"
                                        type="time"
                                        variant="standard"
                                        value={formData.powerOnTime}
                                        onChange={handleChange}
                                        sx={{ width: 180 }}
                                        required
                                        disabled={isLoading}
                                    />
                                </Grid>
                            </Grid>

                            <FormControl disabled={isLoading}>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    Power off/on recurrence:
                                </Typography>
                               <RadioGroup
                                    row
                                    name="recurrence"
                                    value={formData.recurrence}
                                    onChange={handleChange}
                                >
                                    {["workdays", "everyday", "weekends"].map((option) => (
                                        <FormControlLabel
                                            key={option}
                                            value={option}
                                            control={
                                                <Radio
                                                    sx={{
                                                        color: "#f06292",
                                                        "&.Mui-checked": { color: "#f06292" },
                                                    }}
                                                />
                                            }
                                            label={
                                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                                    <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
                                                        {option}
                                                    </Typography>
                                                    <Tooltip title={RECURRENCE_TOOLTIPS[option]}>
                                                        <InfoOutlinedIcon fontSize="inherit" color="action" />
                                                    </Tooltip>
                                                </Stack>
                                            }
                                        />
                                    ))}
                                </RadioGroup>
                            </FormControl>

                            <Box>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    Scheduling overview:
                                </Typography>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell />
                                            {DAYS.map((day) => (
                                                <TableCell key={day} align="center">{day}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell>Power On</TableCell>
                                            {DAYS.map((day) => (
                                                <TableCell key={day} align="center">
                                                    {isDayActive(day, formData.recurrence) && formData.powerOnTime
                                                        ? formData.powerOnTime
                                                        : "—"}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Power Off</TableCell>
                                            {DAYS.map((day) => (
                                                <TableCell key={day} align="center">
                                                    {isDayActive(day, formData.recurrence) && formData.powerOffTime
                                                        ? formData.powerOffTime
                                                        : "—"}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </Box>
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ justifyContent: "space-between", px: 3 }}>
                        {hasExistingSchedule ? (
                            <Button
                                onClick={handleRemoveSchedule}
                                color="error"
                                variant="contained"
                                disabled={isSubmitting || isLoading}
                            >
                                Remove Schedule
                            </Button>
                        ) : (
                            <span />
                        )}
                        <Stack direction="row" spacing={1}>
                            <Button onClick={handleDialogClose} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                form="schedule-form"
                                variant="contained"
                                disabled={isSubmitting || isLoading}
                            >
                                {isSubmitting ? "Saving..." : "Submit"}
                            </Button>
                        </Stack>
                    </DialogActions>
                </>
            )}

            {tab === 1 && (
                <DialogContent>
                    <Typography color="text.secondary">Calendar Scheduler coming soon.</Typography>
                </DialogContent>
            )}
        </DockedDialog>
    );
};

ScheduleForm.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func,
    device: PropTypes.object,
};

export default ScheduleForm;