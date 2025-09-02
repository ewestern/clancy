import { CronExpression } from "cron-parser";

/**
 * Converts a CronExpression into a human-friendly description
 */
export function humanFriendlyCron(cronExpression: CronExpression): string {
  const fields = cronExpression.fields;

  // Handle predefined expressions first
  const cronString = cronExpression.stringify();
  switch (cronString) {
    case "0 0 0 1 1 *":
      return "Once a year on January 1st at midnight";
    case "0 0 0 1 * *":
      return "Once a month on the 1st at midnight";
    case "0 0 0 * * 0":
      return "Once a week on Sunday at midnight";
    case "0 0 0 * * *":
      return "Every day at midnight";
    case "0 0 * * * *":
      return "Every hour";
    case "0 * * * * *":
      return "Every minute";
    case "* * * * * *":
      return "Every second";
  }

  // Build description parts
  let parts: string[] = [];

  // Handle frequency patterns
  if (isEveryMinute(fields)) {
    parts.push("Every minute");
  } else if (isEveryHour(fields)) {
    parts.push("Every hour");
  } else if (isEveryDay(fields)) {
    parts.push("Every day");
  } else if (isWeekly(fields)) {
    parts.push(formatWeekdays(fields.dayOfWeek.values));
  } else if (isMonthly(fields)) {
    parts.push("Every month");
  } else {
    // Complex pattern - describe each relevant field
    if (!isWildcard(fields.minute)) {
      parts.push(`at ${formatMinutes(fields.minute.values)}`);
    }
    if (!isWildcard(fields.hour)) {
      parts.push(`at ${formatHours(fields.hour.values)}`);
    }
    if (!isWildcard(fields.dayOfMonth)) {
      parts.push(`on ${formatDayOfMonth(fields.dayOfMonth.values)}`);
    }
    if (!isWildcard(fields.month)) {
      parts.push(`in ${formatMonths(fields.month.values)}`);
    }
    if (!isWildcard(fields.dayOfWeek)) {
      parts.push(`on ${formatWeekdays(fields.dayOfWeek.values)}`);
    }
  }

  // Add time specifics for non-wildcard patterns
  if (
    !isEveryMinute(fields) &&
    !isWildcard(fields.hour) &&
    isWildcard(fields.minute)
  ) {
    parts.push("on the hour");
  } else if (
    !isEveryMinute(fields) &&
    !isWildcard(fields.hour) &&
    !isWildcard(fields.minute)
  ) {
    const time = formatTime(fields.hour.values, fields.minute.values);
    const firstPart =
      parts.length > 0 && parts[0] !== undefined ? parts[0] : "";
    const modifiedFirstPart = firstPart.replace(/^Every /, "");
    return `${modifiedFirstPart ? modifiedFirstPart + " " : ""}at ${time}${parts.slice(1).join(" ")}`;
  }

  return parts.join(" ") || "Custom schedule";
}

// Helper functions
function isWildcard(field: any): boolean {
  return field.length === 1 && field[0] === -1; // -1 typically represents wildcard in cron-parser
}

function isEveryMinute(fields: any): boolean {
  return (
    isWildcard(fields.minute) &&
    isWildcard(fields.hour) &&
    isWildcard(fields.dayOfMonth) &&
    isWildcard(fields.month) &&
    isWildcard(fields.dayOfWeek)
  );
}

function isEveryHour(fields: any): boolean {
  return (
    !isWildcard(fields.minute) &&
    fields.minute.length === 1 &&
    fields.minute[0] === 0 &&
    isWildcard(fields.hour) &&
    isWildcard(fields.dayOfMonth) &&
    isWildcard(fields.month) &&
    isWildcard(fields.dayOfWeek)
  );
}

function isEveryDay(fields: any): boolean {
  return (
    !isWildcard(fields.minute) &&
    !isWildcard(fields.hour) &&
    isWildcard(fields.dayOfMonth) &&
    isWildcard(fields.month) &&
    isWildcard(fields.dayOfWeek)
  );
}

function isWeekly(fields: any): boolean {
  return !isWildcard(fields.dayOfWeek) && isWildcard(fields.dayOfMonth);
}

function isMonthly(fields: any): boolean {
  return !isWildcard(fields.dayOfMonth) && isWildcard(fields.dayOfWeek);
}

function formatTime(hours: number[], minutes: number[]): string {
  if (
    hours.length === 1 &&
    minutes.length === 1 &&
    hours[0] !== undefined &&
    minutes[0] !== undefined
  ) {
    const hour = hours[0];
    const minute = minutes[0];
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const displayMinute = minute.toString().padStart(2, "0");
    return `${displayHour}:${displayMinute} ${ampm}`;
  }
  return `${formatHours(hours)}:${formatMinutes(minutes)}`;
}

function formatMinutes(minutes: number[]): string {
  if (minutes.length === 1) {
    return minutes[0]?.toString().padStart(2, "0") || "";
  }
  return `(${minutes.join(", ")})`;
}

function formatHours(hours: number[]): string {
  if (hours.length === 1 && hours[0] !== undefined) {
    const hour = hours[0];
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour} ${ampm}`;
  }
  return hours
    .filter((h) => h !== undefined)
    .map((h) => {
      const ampm = h >= 12 ? "PM" : "AM";
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${displayHour} ${ampm}`;
    })
    .join(", ");
}

function formatDayOfMonth(days: (number | "L")[]): string {
  if (days.includes("L")) {
    return "the last day of the month";
  }
  if (days.length === 1) {
    const day = days[0];
    const suffix =
      day === 1 || day === 21 || day === 31
        ? "st"
        : day === 2 || day === 22
          ? "nd"
          : day === 3 || day === 23
            ? "rd"
            : "th";
    return `the ${day}${suffix}`;
  }
  return `days ${days.join(", ")}`;
}

function formatMonths(months: number[]): string {
  const monthNames = [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  if (months.length === 1 && months[0] !== undefined) {
    return monthNames[months[0]] || "Unknown month";
  }
  return months
    .filter((m) => m !== undefined)
    .map((m) => monthNames[m] || "Unknown month")
    .join(", ");
}

function formatWeekdays(weekdays: (number | "L")[]): string {
  // replace "L" with Saturday if it exists
  const weekdayNumbers = weekdays.map((d) => (d === "L" ? 6 : d));

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  if (weekdayNumbers.length === 1 && weekdayNumbers[0] !== undefined) {
    return dayNames[weekdayNumbers[0]] || "Unknown day";
  } else if (weekdays.length === 7) {
    return "every day";
  } else if (
    weekdayNumbers.length === 5 &&
    weekdayNumbers.every((d) => d !== undefined && d >= 1 && d <= 5)
  ) {
    return "weekdays";
  } else if (
    weekdayNumbers.length === 2 &&
    weekdayNumbers.includes(0) &&
    weekdayNumbers.includes(6)
  ) {
    return "weekends";
  }

  return weekdayNumbers
    .filter((d) => d !== undefined)
    .map((d) => dayNames[d] || "Unknown day")
    .join(", ");
}
