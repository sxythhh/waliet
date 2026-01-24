"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  BookOpen,
  Video,
  FileText,
  Clock,
  Users,
  MoreHorizontal,
  Play,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EducationTabProps {
  workspaceSlug: string;
}

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  type: "video" | "document" | "quiz";
  duration: string;
  completions: number;
  createdAt: string;
  thumbnail?: string;
}

const typeIcons = {
  video: Video,
  document: FileText,
  quiz: BookOpen,
};

export function EducationTab({ workspaceSlug }: EducationTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [modules] = useState<TrainingModule[]>([]);

  const filteredModules = modules.filter((module) =>
    module.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Education</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create training content for your creators
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Module
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search training modules..."
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Modules Grid */}
      {filteredModules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModules.map((module) => {
            const TypeIcon = typeIcons[module.type];
            return (
              <Card key={module.id} className="bg-card border-border hover:border-primary/40 transition-colors cursor-pointer overflow-hidden">
                {/* Thumbnail */}
                <div className="relative h-36 bg-muted">
                  {module.thumbnail ? (
                    <img
                      src={module.thumbnail}
                      alt={module.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <TypeIcon className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                  {module.type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-background/90 flex items-center justify-center">
                        <Play className="w-5 h-5 text-foreground ml-0.5" />
                      </div>
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary capitalize">
                        {module.type}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-7 h-7 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit Module</DropdownMenuItem>
                        <DropdownMenuItem>View Analytics</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className="font-semibold mb-1 line-clamp-1">{module.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {module.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {module.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {module.completions} completed
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No training modules yet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                Create educational content to help your creators succeed
              </p>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Module
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
