"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  MoreVertical,
  Clock,
  DollarSign,
  Edit,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: number; // in minutes
  isActive: boolean;
  bookingsCount: number;
}

// Default empty services - replace with real API data
const defaultServices: Service[] = [];

export function ServicesTab() {
  const [services, setServices] = useState(defaultServices);

  const toggleServiceStatus = (id: string) => {
    setServices((prev) =>
      prev.map((service) =>
        service.id === id ? { ...service, isActive: !service.isActive } : service
      )
    );
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Your Services</h2>
          <p className="text-sm text-muted-foreground">
            Manage the services you offer to clients
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Service
        </Button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <Card
            key={service.id}
            className={`bg-card border-border/50 transition-opacity ${
              !service.isActive ? "opacity-60" : ""
            }`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">
                      {service.title}
                    </h3>
                    {!service.isActive && (
                      <Badge variant="secondary" className="text-[10px]">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {service.description}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => toggleServiceStatus(service.id)}
                    >
                      {service.isActive ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-2" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Show
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5 text-sm">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="font-semibold">${service.price}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(service.duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <span className="text-xs text-muted-foreground">
                  {service.bookingsCount} bookings
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {service.isActive ? "Active" : "Hidden"}
                  </span>
                  <Switch
                    checked={service.isActive}
                    onCheckedChange={() => toggleServiceStatus(service.id)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State (when no services) */}
      {services.length === 0 && (
        <Card className="bg-card border-border/50 border-dashed">
          <CardContent className="py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No services yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first service to start accepting bookings
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Service
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
