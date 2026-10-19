import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { STATUS_CONFIG, type TeamMember } from "./team-data"
import { getAvatarColor, getInitials } from "./team-utils"

interface TeamMemberAvatarProps {
  member: TeamMember
  size?: "sm" | "lg"
}

/** Initials avatar with a small status dot. */
export function TeamMemberAvatar({ member, size = "lg" }: TeamMemberAvatarProps) {
  const isLarge = size === "lg"

  return (
    <div className="relative shrink-0">
      <Avatar className={isLarge ? "h-11 w-11" : "h-9 w-9"}>
        <AvatarFallback
          className={`font-medium ${isLarge ? "text-sm" : "text-xs"} ${getAvatarColor(member.name)}`}
        >
          {getInitials(member.name)}
        </AvatarFallback>
      </Avatar>
      <span
        title={member.status}
        className={`absolute bottom-0 right-0 rounded-full ring-2 ring-card ${
          isLarge ? "h-3 w-3" : "h-2.5 w-2.5"
        } ${STATUS_CONFIG[member.status].dot}`}
      />
    </div>
  )
}
