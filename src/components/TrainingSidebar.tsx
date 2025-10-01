import { BookOpen, GraduationCap } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
}

interface Module {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  order_index: number;
}

interface TrainingSidebarProps {
  courses: Course[];
  modules: Record<string, Module[]>;
  selectedModuleId: string | null;
  onModuleSelect: (moduleId: string, courseId: string) => void;
}

export function TrainingSidebar({
  courses,
  modules,
  selectedModuleId,
  onModuleSelect,
}: TrainingSidebarProps) {
  const { open } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            {open && <span>Training Courses</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {courses.map((course, courseIndex) => (
                <Collapsible key={course.id} defaultOpen={courseIndex === 0}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={course.title}>
                        <BookOpen className="h-4 w-4" />
                        {open && <span>{course.title}</span>}
                        {open && <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {modules[course.id]?.map((module, moduleIndex) => (
                          <SidebarMenuSubItem key={module.id}>
                            <SidebarMenuSubButton
                              onClick={() => onModuleSelect(module.id, course.id)}
                              isActive={selectedModuleId === module.id}
                            >
                              <span className="text-xs text-muted-foreground">
                                {moduleIndex + 1}
                              </span>
                              {open && <span className="truncate">{module.title}</span>}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
