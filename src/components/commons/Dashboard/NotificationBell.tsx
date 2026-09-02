import React, { ReactNode } from "react";
import { Button, Spinner, Chip, Divider, Popover, PopoverTrigger, PopoverContent } from "@nextui-org/react";
import { FiBell, FiCheck, FiCheckCircle } from "react-icons/fi";
import { formatWaktuRelatif } from "@/utils/date";

/** One row, already mapped out of whatever the role's notification API returns. */
export interface NotificationBellItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  isRead: boolean;
  /** icon rendered inside the round badge (size 22 fits the 11x11 circle) */
  icon: ReactNode;
  /** tailwind colours for that circle, e.g. "bg-amber-100 text-amber-600" */
  iconClassName?: string;
  badgeLabel: string;
  badgeColor?: "primary" | "success" | "warning" | "default";
  /** secondary line next to the badge — the mata pelajaran, normally */
  context?: string;
}

interface NotificationBellProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  unreadCount: number;
  isLoading?: boolean;
  items: NotificationBellItem[];
  onItemClick: (id: string) => void;
  onMarkAllRead: () => void;
  isMarkingAllRead?: boolean;
  /** guru paginates ("Muat lebih banyak"), murid shows an overflow count */
  footer?: ReactNode;
}

/**
 * The dashboard notification bell + popover. Guru and murid consume different
 * notification endpoints with different type vocabularies, so the caller maps
 * its rows into `NotificationBellItem`; everything below is shared chrome.
 */
const NotificationBell: React.FC<NotificationBellProps> = ({
  isOpen,
  onOpenChange,
  unreadCount,
  isLoading = false,
  items,
  onItemClick,
  onMarkAllRead,
  isMarkingAllRead = false,
  footer,
}) => {
  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-6">
          <FiCheckCircle className="text-3xl sm:text-4xl text-success mb-2" />
          <p className="text-gray-500 text-sm sm:text-base">Tidak ada notifikasi</p>
        </div>
      );
    }

    return (
      <div>
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            <div
              className={`p-3 sm:p-4 cursor-pointer hover:bg-gray-50 ${!item.isRead ? "bg-blue-50" : ""} relative`}
              onClick={() => onItemClick(item.id)}
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div
                    className={`${item.iconClassName || "bg-blue-100 text-blue-600"} rounded-full w-11 h-11 flex items-center justify-center`}
                  >
                    {item.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-sm sm:text-base text-gray-800 line-clamp-1">{item.title}</h4>
                    <div className="flex-shrink-0 ml-2 mr-4">
                      <span className="text-xs text-gray-500 whitespace-nowrap inline-block bg-white px-1.5 py-0.5 rounded-md">
                        {formatWaktuRelatif(item.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 line-clamp-2">{item.description}</p>
                  <div className="flex items-center mt-1 gap-2">
                    <Chip size="sm" color={item.badgeColor || "default"} className="h-5 text-xs">
                      {item.badgeLabel}
                    </Chip>
                    {item.context && (
                      <span className="text-xs text-gray-500 truncate">{item.context}</span>
                    )}
                  </div>
                </div>
                {!item.isRead && (
                  <div className="absolute top-4 right-2 w-3 h-3 rounded-full bg-red-500"></div>
                )}
              </div>
            </div>
            {index < items.length - 1 && <Divider />}
          </React.Fragment>
        ))}
        {footer}
      </div>
    );
  };

  return (
    <Popover placement="bottom-end" showArrow={true} isOpen={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger>
        <div className="relative inline-block">
          {/* the trigger wraps this div, but react-aria keeps the press on the
              button, so the button has to drive the popover itself */}
          <Button
            isIconOnly
            variant="light"
            radius="full"
            onPress={() => onOpenChange(!isOpen)}
            className="z-10"
          >
            <FiBell size={20} className="text-gray-700" />
          </Button>
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full z-20 flex items-center justify-center text-white text-xs font-bold px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] sm:w-[360px] p-0">
        <div className="p-3 sm:p-4 border-b">
          <div className="flex items-center justify-center">
            <h3 className="font-semibold text-sm sm:text-base">Notifikasi</h3>
          </div>
          <div className="flex items-center justify-end mt-2">
            <Button
              size="sm"
              variant="light"
              color="primary"
              onPress={onMarkAllRead}
              isLoading={isMarkingAllRead}
              className="text-xs sm:text-sm"
              startContent={<FiCheck size={14} />}
            >
              Tandai semua dibaca
            </Button>
          </div>
        </div>
        <div className="max-h-[280px] overflow-y-auto">{renderBody()}</div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
