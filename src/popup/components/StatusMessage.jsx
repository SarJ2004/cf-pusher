import { AlertCircle, CheckCircle2, Info } from "lucide-react";

const STYLE_BY_TYPE = {
  success:
    "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300",
  error:
    "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
  info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
};

const ICON_BY_TYPE = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const StatusMessage = ({ message }) => {
  if (!message?.text) {
    return null;
  }

  const Icon = ICON_BY_TYPE[message.type] || Info;
  const styleClass = STYLE_BY_TYPE[message.type] || STYLE_BY_TYPE.info;

  return (
    <div className={`mb-3 rounded-lg border p-3 text-sm ${styleClass}`}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{message.text}</p>
      </div>
    </div>
  );
};

export default StatusMessage;
