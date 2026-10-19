"use client"

import * as React from "react"
import {
    Building2Icon,
    BriefcaseBusinessIcon,
    CalendarCheck2Icon,
    CalendarDaysIcon,
    CircleDollarSignIcon,
    ClipboardCheckIcon,
    FileTextIcon,
    HandshakeIcon,
    MailIcon,
    PhoneIcon,
    SearchIcon,
    TargetIcon,
    UserIcon,
    UserRoundCheckIcon,
    UsersIcon,
    VideoIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@workspace/ui/components/command"

export function HeaderSearch() {
    const [open, setOpen] = React.useState(false)

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault()
                setOpen((value) => !value)
            }
        }

        document.addEventListener("keydown", handleKeyDown)

        return () => {
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [])

    return (
        <>
            {/* Desktop search trigger */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="
          relative hidden w-64 md:block
          rounded-lg
          outline-none
          focus-visible:ring-1
          focus-visible:ring-ring
        "
            >
                <SearchIcon
                    className="
            absolute left-2.5 top-1/2
            size-4 -translate-y-1/2
            text-muted-foreground
          "
                />

                <div
                    className="
            flex h-8 w-full items-center
            rounded-lg
            border border-border/70
            bg-muted/30
            pl-8 pr-12
            text-left text-sm
            text-muted-foreground
            shadow-none
            transition-colors
            hover:bg-muted/50
          "
                >
                    Search...
                </div>

                <kbd
                    className="
            pointer-events-none
            absolute right-2 top-1/2
            flex h-5 -translate-y-1/2
            items-center gap-0.5
            rounded border border-border/70
            bg-background
            px-1.5
            text-[10px]
            font-medium
            text-muted-foreground
          "
                >
                    <span>⌘</span>
                    <span>K</span>
                </kbd>
            </button>

            {/* Mobile search */}
            <Button
                variant="ghost"
                size="icon"
                className="
          size-8
          text-muted-foreground
          hover:bg-muted
          hover:text-foreground
          md:hidden
        "
                aria-label="Search"
                onClick={() => setOpen(true)}
            >
                <SearchIcon className="size-4" />
            </Button>

            {/* Search dialog */}
            <CommandDialog open={open} onOpenChange={setOpen}>
                <Command>
                    <CommandInput placeholder="Search leads, contacts, companies..." />

                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>

                        <CommandGroup heading="Leads">
                            <CommandItem onSelect={() => setOpen(false)}>
                                <TargetIcon />
                                <span className="min-w-0 flex-1 truncate">Sarah Miller</span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Lead
                                </span>
                            </CommandItem>

                            <CommandItem onSelect={() => setOpen(false)}>
                                <UserRoundCheckIcon />
                                <span className="min-w-0 flex-1 truncate">David Wilson</span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Lead
                                </span>
                            </CommandItem>

                            <CommandItem onSelect={() => setOpen(false)}>
                                <MailIcon />
                                <span className="min-w-0 flex-1 truncate">Emily Johnson</span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Lead
                                </span>
                            </CommandItem>

                            <CommandItem onSelect={() => setOpen(false)}>
                                <PhoneIcon />
                                <span className="min-w-0 flex-1 truncate">Michael Brown</span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Lead
                                </span>
                            </CommandItem>
                        </CommandGroup>

                        <CommandSeparator />

                        <CommandGroup heading="Contacts">
                            <CommandItem onSelect={() => setOpen(false)}>
                                <UserIcon />
                                <span className="min-w-0 flex-1 truncate">John Anderson</span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Contact
                                </span>
                            </CommandItem>

                            <CommandItem onSelect={() => setOpen(false)}>
                                <UsersIcon />
                                <span className="min-w-0 flex-1 truncate">Olivia Taylor</span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Contact
                                </span>
                            </CommandItem>

                            <CommandItem onSelect={() => setOpen(false)}>
                                <PhoneIcon />
                                <span className="min-w-0 flex-1 truncate">James Martinez</span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Contact
                                </span>
                            </CommandItem>

                            <CommandItem onSelect={() => setOpen(false)}>
                                <MailIcon />
                                <span className="min-w-0 flex-1 truncate">Sophia Davis</span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Contact
                                </span>
                            </CommandItem>
                        </CommandGroup>

                        <CommandSeparator />

                        <CommandGroup heading="Companies">
                            <CommandItem onSelect={() => setOpen(false)}>
                                <Building2Icon />
                                <span className="min-w-0 flex-1 truncate">Acme Corporation</span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Company
                                </span>
                            </CommandItem>

                            <CommandItem onSelect={() => setOpen(false)}>
                                <BriefcaseBusinessIcon />
                                <span className="min-w-0 flex-1 truncate">Horizon Technologies</span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Company
                                </span>
                            </CommandItem>

                            <CommandItem onSelect={() => setOpen(false)}>
                                <HandshakeIcon />
                                <span className="min-w-0 flex-1 truncate">Northstar Labs</span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Company
                                </span>
                            </CommandItem>

                            <CommandItem onSelect={() => setOpen(false)}>
                                <FileTextIcon />
                                <span className="min-w-0 flex-1 truncate">Vertex Solutions</span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Company
                                </span>
                            </CommandItem>
                        </CommandGroup>

                        <CommandSeparator />

                        <CommandGroup heading="Deals">
                            <CommandItem onSelect={() => setOpen(false)}>
                                <CircleDollarSignIcon />
                                <span className="min-w-0 flex-1 truncate">
                                    Acme Enterprise Deal
                                </span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Deal
                                </span>
                            </CommandItem>

                            <CommandItem onSelect={() => setOpen(false)}>
                                <HandshakeIcon />
                                <span className="min-w-0 flex-1 truncate">
                                    Horizon Platform
                                </span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Deal
                                </span>
                            </CommandItem>

                            <CommandItem onSelect={() => setOpen(false)}>
                                <BriefcaseBusinessIcon />
                                <span className="min-w-0 flex-1 truncate">
                                    Northstar Renewal
                                </span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Deal
                                </span>
                            </CommandItem>

                            <CommandItem onSelect={() => setOpen(false)}>
                                <FileTextIcon />
                                <span className="min-w-0 flex-1 truncate">
                                    Vertex Expansion
                                </span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Deal
                                </span>
                            </CommandItem>
                        </CommandGroup>

                        <CommandSeparator />

                        <CommandGroup heading="Activities">
                            <CommandItem onSelect={() => setOpen(false)}>
                                <CalendarDaysIcon />
                                <span className="min-w-0 flex-1 truncate">
                                    Client Meeting
                                </span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Activity
                                </span>
                            </CommandItem>

                            <CommandItem onSelect={() => setOpen(false)}>
                                <CalendarCheck2Icon />
                                <span className="min-w-0 flex-1 truncate">
                                    Follow-up with Acme
                                </span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Activity
                                </span>
                            </CommandItem>

                            <CommandItem onSelect={() => setOpen(false)}>
                                <VideoIcon />
                                <span className="min-w-0 flex-1 truncate">
                                    Product Demo
                                </span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Activity
                                </span>
                            </CommandItem>

                            <CommandItem onSelect={() => setOpen(false)}>
                                <ClipboardCheckIcon />
                                <span className="min-w-0 flex-1 truncate">
                                    Sales Follow-up
                                </span>
                                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                                    Activity
                                </span>
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </CommandDialog>
        </>
    )
}