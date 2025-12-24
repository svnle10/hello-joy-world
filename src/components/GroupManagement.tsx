import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Group {
  id: string;
  group_number: number;
  booking_reference: string;
  customer_name: string;
  phone: string | null;
  email: string | null;
  number_of_people: number;
  language: string;
  meeting_point: string;
  meeting_time: string;
  tour_date: string;
  guide_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  guide_name?: string;
}

interface Guide {
  user_id: string;
  full_name: string;
}

const MEETING_TIMES = [
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
];

const LANGUAGES = [
  "English",
  "Arabic",
  "French",
  "Spanish",
  "German",
  "Italian",
  "Chinese",
  "Japanese",
  "Russian",
  "Portuguese",
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-700",
  confirmed: "bg-green-500/20 text-green-700",
  completed: "bg-blue-500/20 text-blue-700",
  cancelled: "bg-red-500/20 text-red-700",
};

export const GroupManagement = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Form state
  const [formData, setFormData] = useState({
    group_number: "",
    booking_reference: "",
    customer_name: "",
    phone: "",
    email: "",
    number_of_people: "1",
    language: "English",
    meeting_point: "",
    meeting_time: "1:00 PM",
    tour_date: format(new Date(), "yyyy-MM-dd"),
    guide_id: "",
    status: "pending",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch guides
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "guide");

      if (rolesData) {
        const guideIds = rolesData.map((r) => r.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", guideIds);

        if (profilesData) {
          setGuides(profilesData);
        }
      }

      // Fetch groups for selected date
      const { data: groupsData, error } = await supabase
        .from("groups")
        .select("*")
        .eq("tour_date", selectedDate)
        .order("meeting_time", { ascending: true });

      if (error) throw error;

      // Enrich with guide names
      if (groupsData) {
        const enrichedGroups = groupsData.map((group) => {
          const guide = guides.find((g) => g.user_id === group.guide_id);
          return {
            ...group,
            guide_name: guide?.full_name || "Not Assigned",
          };
        });
        setGroups(enrichedGroups);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      group_number: "",
      booking_reference: "",
      customer_name: "",
      phone: "",
      email: "",
      number_of_people: "1",
      language: "English",
      meeting_point: "",
      meeting_time: "1:00 PM",
      tour_date: selectedDate,
      guide_id: "",
      status: "pending",
      notes: "",
    });
    setEditingGroup(null);
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      group_number: group.group_number.toString(),
      booking_reference: group.booking_reference,
      customer_name: group.customer_name,
      phone: group.phone || "",
      email: group.email || "",
      number_of_people: group.number_of_people.toString(),
      language: group.language,
      meeting_point: group.meeting_point,
      meeting_time: group.meeting_time,
      tour_date: group.tour_date,
      guide_id: group.guide_id || "",
      status: group.status,
      notes: group.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("You must be logged in");
        return;
      }

      const groupData = {
        group_number: parseInt(formData.group_number),
        booking_reference: formData.booking_reference.trim(),
        customer_name: formData.customer_name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        number_of_people: parseInt(formData.number_of_people),
        language: formData.language,
        meeting_point: formData.meeting_point.trim(),
        meeting_time: formData.meeting_time,
        tour_date: formData.tour_date,
        guide_id: formData.guide_id || null,
        status: formData.status,
        notes: formData.notes.trim() || null,
        created_by: userData.user.id,
      };

      if (editingGroup) {
        const { error } = await supabase
          .from("groups")
          .update(groupData)
          .eq("id", editingGroup.id);

        if (error) throw error;
        toast.success("Group updated successfully");
      } else {
        const { error } = await supabase.from("groups").insert(groupData);

        if (error) throw error;
        toast.success("Group added successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error saving group:", error);
      toast.error(error.message || "Failed to save group");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;

    try {
      const { error } = await supabase.from("groups").delete().eq("id", id);

      if (error) throw error;
      toast.success("Group deleted successfully");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting group:", error);
      toast.error(error.message || "Failed to delete group");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Group Management
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="tour-date">Date:</Label>
            <Input
              id="tour-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingGroup ? "Edit Group" : "Add New Group"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="group_number">Group Number *</Label>
                    <Input
                      id="group_number"
                      type="number"
                      value={formData.group_number}
                      onChange={(e) =>
                        setFormData({ ...formData, group_number: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="booking_reference">Booking Reference *</Label>
                    <Input
                      id="booking_reference"
                      value={formData.booking_reference}
                      onChange={(e) =>
                        setFormData({ ...formData, booking_reference: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Customer Name *</Label>
                    <Input
                      id="customer_name"
                      value={formData.customer_name}
                      onChange={(e) =>
                        setFormData({ ...formData, customer_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number_of_people">Number of People *</Label>
                    <Input
                      id="number_of_people"
                      type="number"
                      min="1"
                      value={formData.number_of_people}
                      onChange={(e) =>
                        setFormData({ ...formData, number_of_people: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language *</Label>
                    <Select
                      value={formData.language}
                      onValueChange={(value) =>
                        setFormData({ ...formData, language: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {lang}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meeting_time">Meeting Time *</Label>
                    <Select
                      value={formData.meeting_time}
                      onValueChange={(value) =>
                        setFormData({ ...formData, meeting_time: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEETING_TIMES.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="meeting_point">Meeting Point *</Label>
                    <Input
                      id="meeting_point"
                      value={formData.meeting_point}
                      onChange={(e) =>
                        setFormData({ ...formData, meeting_point: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tour_date">Tour Date *</Label>
                    <Input
                      id="tour_date"
                      type="date"
                      value={formData.tour_date}
                      onChange={(e) =>
                        setFormData({ ...formData, tour_date: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="guide">Assign Guide</Label>
                    <Select
                      value={formData.guide_id || "none"}
                      onValueChange={(value) =>
                        setFormData({ ...formData, guide_id: value === "none" ? "" : value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a guide" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not Assigned</SelectItem>
                        {guides.map((guide) => (
                          <SelectItem key={guide.user_id} value={guide.user_id}>
                            {guide.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingGroup ? "Update" : "Add"} Group
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No groups found for this date. Click "Add Group" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group #</TableHead>
                  <TableHead>Booking Ref</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>People</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Meeting Time</TableHead>
                  <TableHead>Meeting Point</TableHead>
                  <TableHead>Guide</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.group_number}</TableCell>
                    <TableCell>{group.booking_reference}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{group.customer_name}</div>
                        {group.phone && (
                          <div className="text-sm text-muted-foreground">{group.phone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{group.number_of_people}</TableCell>
                    <TableCell>{group.language}</TableCell>
                    <TableCell>{group.meeting_time}</TableCell>
                    <TableCell>{group.meeting_point}</TableCell>
                    <TableCell>
                      {guides.find((g) => g.user_id === group.guide_id)?.full_name || (
                        <span className="text-muted-foreground">Not Assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[group.status] || ""}>
                        {group.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(group)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(group.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
