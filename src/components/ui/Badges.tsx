import type { TournamentStatus, UserRole } from "@/types";

const STATUS_STYLES: Record<TournamentStatus, string> = {
  DRAFT:        "bg-gray-500/15 text-gray-300 border-gray-500/30",
  REGISTRATION: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  GROUP_STAGE:  "bg-amber-500/15 text-amber-300 border-amber-500/30",
  KNOCKOUT:     "bg-red-500/15 text-red-300 border-red-500/30",
  FINISHED:     "bg-green-500/15 text-green-300 border-green-500/30",
};

const STATUS_LABELS: Record<TournamentStatus, string> = {
  DRAFT: "Draft", REGISTRATION: "Registration",
  GROUP_STAGE: "Group Stage", KNOCKOUT: "Knockout", FINISHED: "Finished",
};

export const StatusBadge = ({ status }: { status: TournamentStatus }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-gaming font-bold border tracking-wider ${STATUS_STYLES[status]}`}>
    {STATUS_LABELS[status]}
  </span>
);

const ROLE_STYLES: Record<UserRole, string> = {
  admin:  "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  staff:  "bg-purple-500/15 text-purple-300 border-purple-500/30",
  player: "bg-gray-500/15 text-gray-300 border-gray-500/30",
};

export const RoleBadge = ({ role }: { role: UserRole }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-gaming font-bold border tracking-wider uppercase ${ROLE_STYLES[role]}`}>
    {role}
  </span>
);
