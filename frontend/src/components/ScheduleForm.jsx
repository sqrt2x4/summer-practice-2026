import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { apiFetch } from "../utils/api";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    Grid,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
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
    endDate: "",
    powerOnTime: "",
    powerOffTime: "",
    recurrence: "everyday",
    consumptionPerHour: "",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKEND_DAYS = ["Sat", "Sun"];

const RECURRENCE_TOOLTIPS = {
    workdays: "Applies Monday through Friday",
    everyday: "Applies every day of the week",
    weekends: "Applies Saturday and Sunday",
};

const RECURRENCE_DAYS_PER_WEEK = {
    workdays: 5,
    weekends: 2,
    everyday: 7,
};

const toMinutes = (hhmm) => {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
};

const computeEstimatedSavings = ({ powerOnTime, powerOffTime, recurrence, consumptionPerHour }) => {
    const onMin = toMinutes(powerOnTime);
    const offMin = toMinutes(powerOffTime);
    const consumption = parseFloat(consumptionPerHour);

    if (onMin === null || offMin === null || Number.isNaN(consumption) || consumption <= 0) {
        return null;
    }

    // Duration the device is ON, handling wraparound past midnight
    const onDurationMin = (offMin - onMin + 1440) % 1440;
    const offDurationHours = 24 - onDurationMin / 60;

    const dailyKwh = offDurationHours * consumption;
    const daysPerWeek = RECURRENCE_DAYS_PER_WEEK[recurrence] || 0;
    const weeklyKwh = dailyKwh * daysPerWeek;

    return {
        offHoursPerDay: offDurationHours,
        dailyKwh,
        weeklyKwh,
    };
};

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES_5 = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...,55

// "HH:MM" (24h) -> { hour12, minute, period }
const from24Hour = (value) => {
    if (!value) return { hour: 12, minute: 0, period: "AM" };
    const [hStr, mStr] = value.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return { hour: 12, minute: 0, period: "AM" };
    const period = h >= 12 ? "PM" : "AM";
    let hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;
    return { hour: hour12, minute: m, period };
};

// { hour12, minute, period } -> "HH:MM" (24h)
const to24Hour = (hour12, minute, period) => {
    let h = hour12 % 12;
    if (period === "PM") h += 12;
    return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const isDayActive = (day, recurrence) => {
    if (recurrence === "everyday") return true;
    const isWeekendDay = WEEKEND_DAYS.includes(day);
    if (recurrence === "weekends") return isWeekendDay;
    if (recurrence === "workdays") return !isWeekendDay;
    return false;
};

const TimeSelectGroup = ({ label, value, onChange, disabled }) => {
    const { hour, minute, period } = from24Hour(value);

    const handleHourChange = (e) => {
        onChange(to24Hour(Number(e.target.value), minute, period));
    };

    const handleMinuteChange = (e) => {
        onChange(to24Hour(hour, Number(e.target.value), period));
    };

    const handlePeriodChange = (e) => {
        onChange(to24Hour(hour, minute, e.target.value));
    };

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {label} *
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
                <FormControl variant="standard" sx={{ width: 64 }} disabled={disabled} required>
                    <Select value={hour} onChange={handleHourChange}>
                        {HOURS_12.map((h) => (
                            <MenuItem key={h} value={h}>{h}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Typography variant="body2">:</Typography>
                <FormControl variant="standard" sx={{ width: 64 }} disabled={disabled} required>
                    <Select value={minute} onChange={handleMinuteChange}>
                        {MINUTES_5.map((m) => (
                            <MenuItem key={m} value={m}>{String(m).padStart(2, "0")}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl variant="standard" sx={{ width: 68 }} disabled={disabled} required>
                    <Select value={period} onChange={handlePeriodChange}>
                        <MenuItem value="AM">AM</MenuItem>
                        <MenuItem value="PM">PM</MenuItem>
                    </Select>
                </FormControl>
            </Stack>
        </Box>
    );
};

TimeSelectGroup.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
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
    const [hasEndDate, setHasEndDate] = useState(false);

    const deviceId = device?._id?.$oid || device?._id;
    const estimatedSavings = computeEstimatedSavings(formData);

    useEffect(() => {
        if (!open || !deviceId) return;

        const fetchSchedule = async () => {
            setIsLoading(true);
            setError("");
            try {
                const response = await apiFetch(`/schedule/${deviceId}`);
                if (!response.ok) {
                    throw new Error(`Failed to load schedule: ${response.status}`);
                }
                const data = await response.json();
                if (data) {
                    setFormData({
                        startDate: data.startDate,
                        endDate: data.endDate || "",
                        powerOnTime: data.powerOnTime,
                        powerOffTime: data.powerOffTime,
                        recurrence: data.recurrence,
                        consumptionPerHour: data.consumptionPerHour ?? "",
                    });
                    setHasEndDate(Boolean(data.endDate));
                    setHasExistingSchedule(true);
                } else {
                    setFormData({ ...initialFormData });
                    setHasEndDate(false);
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
        setHasEndDate(false);
        setHasExistingSchedule(false);
        setTab(0);
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        try {
            const url = hasExistingSchedule ? `/schedule/${deviceId}` : "/schedule";
            const method = hasExistingSchedule ? "PUT" : "POST";
            const body = hasExistingSchedule ? formData : { ...formData, device: deviceId };

            const response = await apiFetch(url, {
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
            const response = await apiFetch(`/schedule/${deviceId}`, {
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
                            <Box sx={{ width: 280 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    Start Date *
                                </Typography>
                                <TextField
                                    name="startDate"
                                    type="date"
                                    variant="standard"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    fullWidth
                                    required
                                    disabled={isLoading}
                                    sx={{ mb: 1.5 }}
                                />

                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={hasEndDate}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setHasEndDate(checked);
                                                if (!checked) {
                                                    setFormData((prev) => ({ ...prev, endDate: "" }));
                                                }
                                            }}
                                            disabled={isLoading}
                                            sx={{
                                                color: "#f06292",
                                                "&.Mui-checked": { color: "#f06292" },
                                            }}
                                        />
                                    }
                                    label={
                                        <Typography variant="body2" color="text.secondary">
                                            Set recurrence end date
                                        </Typography>
                                    }
                                    sx={{ ml: -1 }}
                                />

                                {hasEndDate ? (
                                    <TextField
                                        name="endDate"
                                        type="date"
                                        variant="standard"
                                        value={formData.endDate}
                                        onChange={handleChange}
                                        fullWidth
                                        required
                                        disabled={isLoading}
                                    />
                                ) : (
                                    <Typography variant="caption" display="block" sx={{ color: "#f8bbd0" }}>
                                        Default: Never
                                    </Typography>
                                )}
                            </Box>

                           <Grid container spacing={4}>
                                <Grid item>
                                    <TimeSelectGroup
                                        label="Power Off Time"
                                        value={formData.powerOffTime}
                                        onChange={(newValue) => setFormData((prev) => ({ ...prev, powerOffTime: newValue }))}
                                        disabled={isLoading}
                                    />
                                </Grid>
                                <Grid item>
                                    <TimeSelectGroup
                                        label="Power On Time"
                                        value={formData.powerOnTime}
                                        onChange={(newValue) => setFormData((prev) => ({ ...prev, powerOnTime: newValue }))}
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
                                <TextField
                                    name="consumptionPerHour"
                                    label="Power Consumption (kWh per hour)"
                                    type="number"
                                    variant="standard"
                                    value={formData.consumptionPerHour}
                                    onChange={handleChange}
                                    inputProps={{ min: 0, step: 0.1 }}
                                    sx={{ width: 280 }}
                                    required
                                    disabled={isLoading}
                                />
                                {estimatedSavings && (
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: 1,
                                            backgroundColor: "#fcfae4",
                                        }}
                                    >
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                            Estimated Savings
                                        </Typography>
                                        <Typography variant="body2">
                                            Device off <strong>{estimatedSavings.offHoursPerDay.toFixed(1)}h/day</strong> →{" "}
                                            <strong>{estimatedSavings.dailyKwh.toFixed(2)} kWh/day</strong>,{" "}
                                            <strong>{estimatedSavings.weeklyKwh.toFixed(2)} kWh/week</strong>
                                        </Typography>
                                    </Box>
                                )}
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