import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Users,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Globe,
  Loader2,
  Upload,
} from "lucide-react";
import { format } from "date-fns";

interface Group {
  id: string;
  group_number: number;
  tour_date: string;
  meeting_time: string;
  total_participants: number;
  status: string;
  notes: string | null;
  guide_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Booking {
  id: string;
  group_id: string;
  booking_reference: string;
  customer_name: string;
  phone: string | null;
  email: string | null;
  number_of_people: number;
  language: string;
  meeting_point: string;
  created_at: string;
}

interface Guide {
  user_id: string;
  full_name: string;
}

interface ParsedBooking {
  phone: string;
  booking_reference: string;
  email: string;
  customer_name: string;
  language: string;
  number_of_people: number;
  meeting_point: string;
}

interface ParsedGroup {
  date: string;
  time: string;
  group_number: number;
  total_participants: number;
  bookings: ParsedBooking[];
}

const MEETING_TIMES = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

const LANGUAGES = ["English", "French", "Spanish", "Arabic", "German", "Italian", "Portuguese"];

const MEETING_POINTS = [
  "Bab Agnaou",
  "Asswak Essalam",
  "Jardin Majorelle",
  "Arsat My Abdesalam",
  "Jemaa el-Fna",
  "Koutoubia Mosque",
];

export const GroupManagement = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [bookings, setBookings] = useState<Record<string, Booking[]>>({});
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isBulkImportDialogOpen, setIsBulkImportDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bulkImportText, setBulkImportText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ParsedGroup | null>(null);
  const [importing, setImporting] = useState(false);

  const [groupFormData, setGroupFormData] = useState({
    group_number: 1,
    tour_date: format(new Date(), "yyyy-MM-dd"),
    meeting_time: "13:00",
    status: "pending",
    notes: "",
    guide_id: "",
  });

  const [bookingFormData, setBookingFormData] = useState({
    booking_reference: "",
    customer_name: "",
    phone: "",
    email: "",
    number_of_people: 1,
    language: "English",
    meeting_point: "",
  });

  useEffect(() => {
    fetchGroups();
    fetchGuides();
  }, [selectedDate]);

  const parseImportText = (text: string): ParsedGroup | null => {
    try {
      // Parse date: 📅 Date: 24/12/25 or 📅 Date: 24/12/2025
      const dateMatch = text.match(/📅\s*Date:\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i);
      if (!dateMatch) return null;

      const day = dateMatch[1].padStart(2, "0");
      const month = dateMatch[2].padStart(2, "0");
      let year = dateMatch[3];
      if (year.length === 2) {
        year = "20" + year;
      }
      const date = `${year}-${month}-${day}`;

      // Parse total participants: 👥 Total Participants: 48P
      const participantsMatch = text.match(/👥\s*Total\s*Participants:\s*(\d+)/i);
      const totalParticipants = participantsMatch ? parseInt(participantsMatch[1]) : 0;

      // Parse time: standalone time like 13:00
      const timeMatch = text.match(/\n(\d{1,2}:\d{2})\s*\n/);
      const time = timeMatch ? timeMatch[1] : "13:00";

      // Parse group number and first meeting point: Group 1			bab agnaou
      const groupLineMatch = text.match(/Group\s*(\d+)\s*[\t\s]+([^\n]+)/i);
      const groupNumber = groupLineMatch ? parseInt(groupLineMatch[1]) : 1;
      let currentMeetingPoint = groupLineMatch ? groupLineMatch[2].trim() : "";

      // Parse bookings
      const bookingsList: ParsedBooking[] = [];

      // Split by lines and process
      const lines = text.split("\n");
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for meeting point change - lines starting with tabs (like "		asswak essalam")
        // These are lines that start with whitespace/tabs and contain only text (no emojis)
        if (/^[\t\s]{2,}[^\t\s📞📧👤🗣🔹🎟📅👥]/.test(line)) {
          const potentialPoint = line.trim();
          // Make sure it's not empty and doesn't contain booking data markers
          if (potentialPoint.length > 0 && 
              !potentialPoint.includes("|") && 
              !potentialPoint.includes("@") &&
              !potentialPoint.match(/^\d{1,2}:\d{2}$/)) {
            currentMeetingPoint = potentialPoint;
            continue;
          }
        }

        // Parse booking line: 📞 +33770013442 | 🔹 Booking Ref: GYGX7NRVR2W4
        const phoneMatch = line.match(/📞\s*([+\d]+)/);
        const refMatch = line.match(/🔹\s*Booking\s*Ref:\s*(\w+)/i);

        if (phoneMatch && refMatch) {
          // Get next lines for email, name, language
          const emailLine = lines[i + 1] || "";
          const nameLine = lines[i + 2] || "";
          const langLine = lines[i + 3] || "";

          const emailMatch = emailLine.match(/📧\s*Email:\s*([^\s]+)/i);
          const nameMatch = nameLine.match(/👤\s*Name:\s*(.+)/i);
          const langMatch = langLine.match(/🗣\s*Language:\s*(\w+)/i);
          const partMatch = langLine.match(/🎟\s*Participants:\s*(\d+)/i);

          if (nameMatch) {
            bookingsList.push({
              phone: phoneMatch[1].trim(),
              booking_reference: refMatch[1].trim(),
              email: emailMatch ? emailMatch[1].trim() : "",
              customer_name: nameMatch[1].trim(),
              language: langMatch ? langMatch[1].trim() : "English",
              number_of_people: partMatch ? parseInt(partMatch[1]) : 1,
              meeting_point: currentMeetingPoint || "Unknown",
            });
          }
        }
      }

      if (bookingsList.length === 0) return null;

      return {
        date,
        time,
        group_number: groupNumber,
        total_participants: totalParticipants || bookingsList.reduce((sum, b) => sum + b.number_of_people, 0),
        bookings: bookingsList,
      };
    } catch (error) {
      console.error("Parse error:", error);
      return null;
    }
  };

  const handleBulkImportTextChange = (text: string) => {
    setBulkImportText(text);
    const parsed = parseImportText(text);
    setParsedPreview(parsed);
  };

  const handleBulkImport = async () => {
    if (!parsedPreview) {
      toast.error("Could not parse the text. Please check the format.");
      return;
    }

    setImporting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("You must be logged in");
        return;
      }

      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .insert({
          group_number: parsedPreview.group_number,
          tour_date: parsedPreview.date,
          meeting_time: parsedPreview.time,
          total_participants: parsedPreview.total_participants,
          status: "pending",
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Create all bookings
      const bookingsToInsert = parsedPreview.bookings.map((b) => ({
        group_id: groupData.id,
        booking_reference: b.booking_reference,
        customer_name: b.customer_name,
        phone: b.phone || null,
        email: b.email || null,
        number_of_people: b.number_of_people,
        language: b.language,
        meeting_point: b.meeting_point,
      }));

      const { error: bookingsError } = await supabase.from("bookings").insert(bookingsToInsert);

      if (bookingsError) throw bookingsError;

      toast.success(`Successfully imported ${parsedPreview.bookings.length} bookings!`);
      setIsBulkImportDialogOpen(false);
      setBulkImportText("");
      setParsedPreview(null);
      setSelectedDate(parsedPreview.date);
      fetchGroups();
    } catch (error: any) {
      toast.error("Failed to import: " + error.message);
    } finally {
      setImporting(false);
    }
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("tour_date", selectedDate)
        .order("meeting_time", { ascending: true });

      if (error) throw error;
      setGroups(data || []);

      if (data && data.length > 0) {
        const groupIds = data.map((g) => g.id);
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select("*")
          .in("group_id", groupIds)
          .order("meeting_point", { ascending: true });

        if (bookingsError) throw bookingsError;

        const bookingsByGroup: Record<string, Booking[]> = {};
        bookingsData?.forEach((booking) => {
          if (!bookingsByGroup[booking.group_id]) {
            bookingsByGroup[booking.group_id] = [];
          }
          bookingsByGroup[booking.group_id].push(booking);
        });
        setBookings(bookingsByGroup);
      } else {
        setBookings({});
      }
    } catch (error: any) {
      toast.error("Failed to load groups: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuides = async () => {
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "guide");

      if (rolesError) throw rolesError;

      if (rolesData && rolesData.length > 0) {
        const guideIds = rolesData.map((r) => r.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", guideIds);

        if (profilesError) throw profilesError;
        setGuides(profilesData || []);
      }
    } catch (error: any) {
      console.error("Error fetching guides:", error);
    }
  };

  const handleSaveGroup = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("You must be logged in");
        return;
      }

      const groupData = {
        group_number: groupFormData.group_number,
        tour_date: groupFormData.tour_date,
        meeting_time: groupFormData.meeting_time,
        status: groupFormData.status,
        notes: groupFormData.notes || null,
        guide_id: groupFormData.guide_id || null,
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
        const { error } = await supabase.from("groups").insert([groupData]);

        if (error) throw error;
        toast.success("Group added successfully");
      }

      setIsGroupDialogOpen(false);
      resetGroupForm();
      fetchGroups();
    } catch (error: any) {
      toast.error("Failed to save group: " + error.message);
    }
  };

  const handleSaveBooking = async () => {
    try {
      if (!selectedGroupId) {
        toast.error("Please select a group first");
        return;
      }

      const bookingData = {
        group_id: selectedGroupId,
        booking_reference: bookingFormData.booking_reference,
        customer_name: bookingFormData.customer_name,
        phone: bookingFormData.phone || null,
        email: bookingFormData.email || null,
        number_of_people: bookingFormData.number_of_people,
        language: bookingFormData.language,
        meeting_point: bookingFormData.meeting_point,
      };

      if (editingBooking) {
        const { error } = await supabase
          .from("bookings")
          .update(bookingData)
          .eq("id", editingBooking.id);

        if (error) throw error;
        toast.success("Booking updated successfully");
      } else {
        const { error } = await supabase.from("bookings").insert([bookingData]);

        if (error) throw error;
        toast.success("Booking added successfully");
      }

      await updateGroupTotalParticipants(selectedGroupId);

      setIsBookingDialogOpen(false);
      resetBookingForm();
      fetchGroups();
    } catch (error: any) {
      toast.error("Failed to save booking: " + error.message);
    }
  };

  const updateGroupTotalParticipants = async (groupId: string) => {
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("number_of_people")
      .eq("group_id", groupId);

    const total = bookingsData?.reduce((sum, b) => sum + b.number_of_people, 0) || 0;

    await supabase.from("groups").update({ total_participants: total }).eq("id", groupId);
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Are you sure you want to delete this group and all its bookings?")) return;

    try {
      const { error } = await supabase.from("groups").delete().eq("id", id);

      if (error) throw error;
      toast.success("Group deleted successfully");
      fetchGroups();
    } catch (error: any) {
      toast.error("Failed to delete group: " + error.message);
    }
  };

  const handleDeleteBooking = async (booking: Booking) => {
    if (!confirm("Are you sure you want to delete this booking?")) return;

    try {
      const { error } = await supabase.from("bookings").delete().eq("id", booking.id);

      if (error) throw error;
      toast.success("Booking deleted successfully");

      await updateGroupTotalParticipants(booking.group_id);
      fetchGroups();
    } catch (error: any) {
      toast.error("Failed to delete booking: " + error.message);
    }
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setGroupFormData({
      group_number: group.group_number,
      tour_date: group.tour_date,
      meeting_time: group.meeting_time,
      status: group.status,
      notes: group.notes || "",
      guide_id: group.guide_id || "",
    });
    setIsGroupDialogOpen(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setSelectedGroupId(booking.group_id);
    setBookingFormData({
      booking_reference: booking.booking_reference,
      customer_name: booking.customer_name,
      phone: booking.phone || "",
      email: booking.email || "",
      number_of_people: booking.number_of_people,
      language: booking.language,
      meeting_point: booking.meeting_point,
    });
    setIsBookingDialogOpen(true);
  };

  const handleAddBookingToGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setEditingBooking(null);
    resetBookingForm();
    setIsBookingDialogOpen(true);
  };

  const resetGroupForm = () => {
    setEditingGroup(null);
    setGroupFormData({
      group_number: 1,
      tour_date: selectedDate,
      meeting_time: "13:00",
      status: "pending",
      notes: "",
      guide_id: "",
    });
  };

  const resetBookingForm = () => {
    setEditingBooking(null);
    setBookingFormData({
      booking_reference: "",
      customer_name: "",
      phone: "",
      email: "",
      number_of_people: 1,
      language: "English",
      meeting_point: "",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      completed: "outline",
      cancelled: "destructive",
    };
    const labels: Record<string, string> = {
      pending: "Pending",
      confirmed: "Confirmed",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  const getGuideName = (guideId: string | null) => {
    if (!guideId) return "Not Assigned";
    const guide = guides.find((g) => g.user_id === guideId);
    return guide?.full_name || "Not Assigned";
  };

  const groupBookingsByMeetingPoint = (groupBookings: Booking[]) => {
    const grouped: Record<string, Booking[]> = {};
    groupBookings?.forEach((booking) => {
      if (!grouped[booking.meeting_point]) {
        grouped[booking.meeting_point] = [];
      }
      grouped[booking.meeting_point].push(booking);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Group Management</h2>
        <div className="flex items-center gap-4 flex-wrap">
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
          
          {/* Bulk Import Button */}
          <Dialog open={isBulkImportDialogOpen} onOpenChange={setIsBulkImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => { setBulkImportText(""); setParsedPreview(null); }}>
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bulk Import Bookings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Paste your group text here:</Label>
                  <Textarea
                    value={bulkImportText}
                    onChange={(e) => handleBulkImportTextChange(e.target.value)}
                    placeholder={`📅 Date: xx/xx/xx
👥 Total Participants: xxP

xx:xx

Group x			xxxxxx

📞 +xxxxxxxxxx | 🔹 Booking Ref: xxxxxxxxxx
📧 Email: xxxxxxxxxx@xxxxxx.xxx
👤 Name: xxxxxxxxxx
🗣 Language: xxxxxx | 🎟 Participants: xP`}
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>

                {parsedPreview && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        Preview ({parsedPreview.bookings.length} bookings found)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Date: {parsedPreview.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Time: {parsedPreview.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>Group: {parsedPreview.group_number}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>Total: {parsedPreview.total_participants}P</span>
                        </div>
                      </div>
                      
                      <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="p-2 text-left">Name</th>
                              <th className="p-2 text-left">Meeting Point</th>
                              <th className="p-2 text-left">Ref</th>
                              <th className="p-2 text-center">P</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedPreview.bookings.map((b, i) => (
                              <tr key={i} className="border-t">
                                <td className="p-2">{b.customer_name}</td>
                                <td className="p-2">{b.meeting_point}</td>
                                <td className="p-2 font-mono text-xs">{b.booking_reference}</td>
                                <td className="p-2 text-center">{b.number_of_people}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button 
                  onClick={handleBulkImport} 
                  className="w-full"
                  disabled={!parsedPreview || importing}
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import {parsedPreview?.bookings.length || 0} Bookings
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetGroupForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingGroup ? "Edit Group" : "Add New Group"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="group_number">Group Number</Label>
                    <Input
                      id="group_number"
                      type="number"
                      min="1"
                      value={groupFormData.group_number}
                      onChange={(e) =>
                        setGroupFormData({
                          ...groupFormData,
                          group_number: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tour_date">Tour Date</Label>
                    <Input
                      id="tour_date"
                      type="date"
                      value={groupFormData.tour_date}
                      onChange={(e) =>
                        setGroupFormData({ ...groupFormData, tour_date: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="meeting_time">Meeting Time</Label>
                    <Select
                      value={groupFormData.meeting_time}
                      onValueChange={(value) =>
                        setGroupFormData({ ...groupFormData, meeting_time: value })
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
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={groupFormData.status}
                      onValueChange={(value) =>
                        setGroupFormData({ ...groupFormData, status: value })
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
                  <Label htmlFor="guide">Assign Guide</Label>
                  <Select
                    value={groupFormData.guide_id || "none"}
                    onValueChange={(value) =>
                      setGroupFormData({
                        ...groupFormData,
                        guide_id: value === "none" ? "" : value,
                      })
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
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={groupFormData.notes}
                    onChange={(e) =>
                      setGroupFormData({ ...groupFormData, notes: e.target.value })
                    }
                    placeholder="Additional notes..."
                  />
                </div>

                <Button onClick={handleSaveGroup} className="w-full">
                  {editingGroup ? "Update" : "Add"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Booking Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBooking ? "Edit Booking" : "Add New Booking"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="booking_reference">Booking Reference</Label>
              <Input
                id="booking_reference"
                value={bookingFormData.booking_reference}
                onChange={(e) =>
                  setBookingFormData({
                    ...bookingFormData,
                    booking_reference: e.target.value,
                  })
                }
                placeholder="GYGX7NRVR2W4"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name</Label>
              <Input
                id="customer_name"
                value={bookingFormData.customer_name}
                onChange={(e) =>
                  setBookingFormData({
                    ...bookingFormData,
                    customer_name: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={bookingFormData.phone}
                  onChange={(e) =>
                    setBookingFormData({ ...bookingFormData, phone: e.target.value })
                  }
                  placeholder="+33770013442"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number_of_people">Participants</Label>
                <Input
                  id="number_of_people"
                  type="number"
                  min="1"
                  value={bookingFormData.number_of_people}
                  onChange={(e) =>
                    setBookingFormData({
                      ...bookingFormData,
                      number_of_people: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={bookingFormData.email}
                onChange={(e) =>
                  setBookingFormData({ ...bookingFormData, email: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={bookingFormData.language}
                  onValueChange={(value) =>
                    setBookingFormData({ ...bookingFormData, language: value })
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
                <Label htmlFor="meeting_point">Meeting Point</Label>
                <Select
                  value={bookingFormData.meeting_point || "select"}
                  onValueChange={(value) =>
                    setBookingFormData({
                      ...bookingFormData,
                      meeting_point: value === "select" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select point" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select">Select point</SelectItem>
                    {MEETING_POINTS.map((point) => (
                      <SelectItem key={point} value={point}>
                        {point}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleSaveBooking}
              className="w-full"
              disabled={!bookingFormData.booking_reference || !bookingFormData.customer_name || !bookingFormData.meeting_point}
            >
              {editingBooking ? "Update" : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Groups List */}
      <div className="space-y-4">
        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No groups for this date
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {groups.map((group) => {
              const groupBookings = bookings[group.id] || [];
              const bookingsByPoint = groupBookingsByMeetingPoint(groupBookings);

              return (
                <AccordionItem
                  key={group.id}
                  value={group.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex flex-col items-start">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">
                              {format(new Date(group.tour_date), "dd/MM/yyyy")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{group.meeting_time}</span>
                          </div>
                        </div>
                        <Badge variant="outline">Group {group.group_number}</Badge>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{group.total_participants}P</span>
                        </div>
                        {getStatusBadge(group.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {getGuideName(group.guide_id)}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Bookings ({groupBookings.length})</h4>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddBookingToGroup(group.id)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Booking
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditGroup(group)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteGroup(group.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {Object.keys(bookingsByPoint).length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          No bookings in this group
                        </p>
                      ) : (
                        Object.entries(bookingsByPoint).map(([meetingPoint, pointBookings]) => (
                          <Card key={meetingPoint}>
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {meetingPoint}
                                <Badge variant="secondary">{pointBookings.length} bookings</Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="space-y-3">
                                {pointBookings.map((booking) => (
                                  <div
                                    key={booking.id}
                                    className="border rounded-lg p-3 space-y-2"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <User className="h-4 w-4 text-muted-foreground" />
                                          <span className="font-medium">
                                            {booking.customer_name}
                                          </span>
                                          <Badge variant="outline">
                                            {booking.number_of_people}P
                                          </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                          {booking.phone && (
                                            <span className="flex items-center gap-1">
                                              <Phone className="h-3 w-3" />
                                              {booking.phone}
                                            </span>
                                          )}
                                          <span className="flex items-center gap-1">
                                            <Globe className="h-3 w-3" />
                                            {booking.language}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                          <span>🔹 Ref: {booking.booking_reference}</span>
                                          {booking.email && (
                                            <span className="flex items-center gap-1">
                                              <Mail className="h-3 w-3" />
                                              {booking.email}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => handleEditBooking(booking)}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => handleDeleteBooking(booking)}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
  );
};
