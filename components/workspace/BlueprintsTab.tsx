"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Package,
  Copy,
  MoreHorizontal,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Star,
  Users,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BlueprintsTabProps {
  workspaceSlug: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  category: string;
  isActive: boolean;
  bookingsCount: number;
  totalRevenue: number;
  rating: number | null;
  reviewsCount: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: "coaching", label: "Coaching" },
  { value: "consulting", label: "Consulting" },
  { value: "mentoring", label: "Mentoring" },
  { value: "training", label: "Training" },
  { value: "therapy", label: "Therapy" },
  { value: "tutoring", label: "Tutoring" },
  { value: "other", label: "Other" },
];

const DURATIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

export function BlueprintsTab({ workspaceSlug }: BlueprintsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration: "60",
    category: "coaching",
  });

  // Load services from localStorage
  useEffect(() => {
    const storageKey = `services-${workspaceSlug}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setServices(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load services:", e);
    }
  }, [workspaceSlug]);

  const saveServices = useCallback(
    (newServices: Service[]) => {
      const storageKey = `services-${workspaceSlug}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(newServices));
        setServices(newServices);
      } catch (e) {
        console.error("Failed to save services:", e);
      }
    },
    [workspaceSlug]
  );

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      duration: "60",
      category: "coaching",
    });
  };

  const handleCreateService = () => {
    if (!formData.name || !formData.price) return;

    const newService: Service = {
      id: `service-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      duration: parseInt(formData.duration),
      category: formData.category,
      isActive: true,
      bookingsCount: 0,
      totalRevenue: 0,
      rating: null,
      reviewsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveServices([...services, newService]);
    setCreateDialogOpen(false);
    resetForm();
  };

  const handleUpdateService = () => {
    if (!editingService || !formData.name || !formData.price) return;

    const updated = services.map((s) =>
      s.id === editingService.id
        ? {
            ...s,
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            duration: parseInt(formData.duration),
            category: formData.category,
            updatedAt: new Date().toISOString(),
          }
        : s
    );

    saveServices(updated);
    setEditingService(null);
    resetForm();
  };

  const handleToggleActive = (serviceId: string) => {
    const updated = services.map((s) =>
      s.id === serviceId ? { ...s, isActive: !s.isActive } : s
    );
    saveServices(updated);
  };

  const handleDeleteService = () => {
    if (!serviceToDelete) return;
    const updated = services.filter((s) => s.id !== serviceToDelete.id);
    saveServices(updated);
    setDeleteConfirmOpen(false);
    setServiceToDelete(null);
  };

  const handleDuplicateService = (service: Service) => {
    const duplicate: Service = {
      ...service,
      id: `service-${Date.now()}`,
      name: `${service.name} (Copy)`,
      bookingsCount: 0,
      totalRevenue: 0,
      rating: null,
      reviewsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveServices([...services, duplicate]);
  };

  const openEditDialog = (service: Service) => {
    setFormData({
      name: service.name,
      description: service.description,
      price: service.price.toString(),
      duration: service.duration.toString(),
      category: service.category,
    });
    setEditingService(service);
  };

  const totalRevenue = services.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalBookings = services.reduce((sum, s) => sum + s.bookingsCount, 0);
  const activeServices = services.filter((s) => s.isActive).length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage your service offerings
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Create Service
        </Button>
      </div>

      {/* Stats Cards */}
      {services.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeServices}</p>
                  <p className="text-xs text-muted-foreground">Active Services</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalBookings}</p>
                  <p className="text-xs text-muted-foreground">Total Bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ${totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg. per Booking</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search services..."
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Services Grid */}
      {filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <Card
              key={service.id}
              className={`bg-card border-border hover:border-primary/40 transition-colors ${
                !service.isActive ? "opacity-60" : ""
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={service.isActive}
                      onCheckedChange={() => handleToggleActive(service.id)}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(service)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateService(service)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setServiceToDelete(service);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{service.name}</h3>
                    {!service.isActive && (
                      <Badge variant="secondary" className="text-[10px]">
                        <EyeOff className="w-3 h-3 mr-1" />
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {service.description || "No description"}
                  </p>
                </div>

                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-1.5 text-sm">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-medium">${service.price}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {service.duration} min
                  </div>
                  {service.rating !== null && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      {service.rating.toFixed(1)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span>{service.bookingsCount} bookings</span>
                  <span>${service.totalRevenue.toLocaleString()} earned</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No services yet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                Create your first service to start accepting bookings from buyers
              </p>
              <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4" />
                Create Service
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Service Dialog */}
      <Dialog
        open={createDialogOpen || editingService !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingService(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Service" : "Create Service"}
            </DialogTitle>
            <DialogDescription>
              {editingService
                ? "Update your service details"
                : "Add a new service for buyers to book"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                placeholder="e.g., 1-on-1 Coaching Session"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this service includes..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="99.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={formData.duration}
                  onValueChange={(value) =>
                    setFormData({ ...formData, duration: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value.toString()}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setEditingService(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingService ? handleUpdateService : handleCreateService}
              disabled={!formData.name || !formData.price}
            >
              {editingService ? "Save Changes" : "Create Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{serviceToDelete?.name}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setServiceToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteService}>
              Delete Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
