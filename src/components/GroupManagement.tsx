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
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

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

      // Fetch bookings for all groups
      if (data && data.length > 0) {
        const groupIds = data.map((g) => g.id);
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select("*")
          .in("group_id", groupIds)
          .order("meeting_point", { ascending: true });

        if (bookingsError) throw bookingsError;

        // Group bookings by group_id
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
      toast.error("فشل في تحميل المجموعات: " + error.message);
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
        toast.error("يجب تسجيل الدخول أولاً");
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
        toast.success("تم تحديث المجموعة بنجاح");
      } else {
        const { error } = await supabase.from("groups").insert([groupData]);

        if (error) throw error;
        toast.success("تم إضافة المجموعة بنجاح");
      }

      setIsGroupDialogOpen(false);
      resetGroupForm();
      fetchGroups();
    } catch (error: any) {
      toast.error("فشل في حفظ المجموعة: " + error.message);
    }
  };

  const handleSaveBooking = async () => {
    try {
      if (!selectedGroupId) {
        toast.error("يجب اختيار مجموعة أولاً");
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
        toast.success("تم تحديث الحجز بنجاح");
      } else {
        const { error } = await supabase.from("bookings").insert([bookingData]);

        if (error) throw error;
        toast.success("تم إضافة الحجز بنجاح");
      }

      // Update total participants
      await updateGroupTotalParticipants(selectedGroupId);

      setIsBookingDialogOpen(false);
      resetBookingForm();
      fetchGroups();
    } catch (error: any) {
      toast.error("فشل في حفظ الحجز: " + error.message);
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
    if (!confirm("هل أنت متأكد من حذف هذه المجموعة وجميع الحجوزات؟")) return;

    try {
      const { error } = await supabase.from("groups").delete().eq("id", id);

      if (error) throw error;
      toast.success("تم حذف المجموعة بنجاح");
      fetchGroups();
    } catch (error: any) {
      toast.error("فشل في حذف المجموعة: " + error.message);
    }
  };

  const handleDeleteBooking = async (booking: Booking) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحجز؟")) return;

    try {
      const { error } = await supabase.from("bookings").delete().eq("id", booking.id);

      if (error) throw error;
      toast.success("تم حذف الحجز بنجاح");

      // Update total participants
      await updateGroupTotalParticipants(booking.group_id);
      fetchGroups();
    } catch (error: any) {
      toast.error("فشل في حذف الحجز: " + error.message);
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
      pending: "قيد الانتظار",
      confirmed: "مؤكد",
      completed: "مكتمل",
      cancelled: "ملغي",
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  const getGuideName = (guideId: string | null) => {
    if (!guideId) return "غير محدد";
    const guide = guides.find((g) => g.user_id === guideId);
    return guide?.full_name || "غير محدد";
  };

  // Group bookings by meeting point
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
        <h2 className="text-2xl font-bold">إدارة المجموعات</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="tour-date">التاريخ:</Label>
            <Input
              id="tour-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetGroupForm}>
                <Plus className="h-4 w-4 mr-2" />
                إضافة مجموعة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingGroup ? "تعديل المجموعة" : "إضافة مجموعة جديدة"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="group_number">رقم المجموعة</Label>
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
                    <Label htmlFor="tour_date">تاريخ الجولة</Label>
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
                    <Label htmlFor="meeting_time">وقت الإلتقاء</Label>
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
                    <Label htmlFor="status">الحالة</Label>
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
                        <SelectItem value="pending">قيد الانتظار</SelectItem>
                        <SelectItem value="confirmed">مؤكد</SelectItem>
                        <SelectItem value="completed">مكتمل</SelectItem>
                        <SelectItem value="cancelled">ملغي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guide">تعيين المرشد</Label>
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
                      <SelectValue placeholder="اختر مرشد" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">غير محدد</SelectItem>
                      {guides.map((guide) => (
                        <SelectItem key={guide.user_id} value={guide.user_id}>
                          {guide.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">ملاحظات</Label>
                  <Input
                    id="notes"
                    value={groupFormData.notes}
                    onChange={(e) =>
                      setGroupFormData({ ...groupFormData, notes: e.target.value })
                    }
                    placeholder="ملاحظات إضافية..."
                  />
                </div>

                <Button onClick={handleSaveGroup} className="w-full">
                  {editingGroup ? "تحديث" : "إضافة"}
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
              {editingBooking ? "تعديل الحجز" : "إضافة حجز جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="booking_reference">رقم الحجز</Label>
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
              <Label htmlFor="customer_name">اسم العميل</Label>
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
                <Label htmlFor="phone">رقم الهاتف</Label>
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
                <Label htmlFor="number_of_people">عدد الأشخاص</Label>
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
              <Label htmlFor="email">البريد الإلكتروني</Label>
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
                <Label htmlFor="language">اللغة</Label>
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
                <Label htmlFor="meeting_point">نقطة الإلتقاء</Label>
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
                    <SelectValue placeholder="اختر نقطة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select">اختر نقطة</SelectItem>
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
              {editingBooking ? "تحديث" : "إضافة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Groups List */}
      <div className="space-y-4">
        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              لا توجد مجموعات لهذا التاريخ
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
                        <h4 className="font-medium">الحجوزات ({groupBookings.length})</h4>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddBookingToGroup(group.id)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            إضافة حجز
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditGroup(group)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            تعديل
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
                          لا توجد حجوزات في هذه المجموعة
                        </p>
                      ) : (
                        Object.entries(bookingsByPoint).map(([meetingPoint, pointBookings]) => (
                          <Card key={meetingPoint}>
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {meetingPoint}
                                <Badge variant="secondary">{pointBookings.length} حجوزات</Badge>
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
