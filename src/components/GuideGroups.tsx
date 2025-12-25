import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Users, Clock, MapPin, Calendar, Phone, Mail, Globe, User, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

interface Booking {
  id: string;
  booking_reference: string;
  customer_name: string;
  phone: string | null;
  email: string | null;
  number_of_people: number;
  language: string;
  meeting_point: string;
  status: string;
}

interface Group {
  id: string;
  group_number: number;
  tour_date: string;
  meeting_time: string;
  total_participants: number;
  status: string;
  notes: string | null;
  bookings?: Booking[];
}

export default function GuideGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBulkImportDialogOpen, setIsBulkImportDialogOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ParsedGroup | null>(null);
  const [importing, setImporting] = useState(false);
  const [groupNumber, setGroupNumber] = useState<number>(1);

  useEffect(() => {
    fetchGroups();
    fetchGuideAssignment();
  }, [user]);

  const fetchGuideAssignment = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('daily_assignments')
        .select('group_number')
        .eq('guide_id', user.id)
        .eq('assignment_date', format(new Date(), 'yyyy-MM-dd'))
        .maybeSingle();
      
      if (data) {
        setGroupNumber(data.group_number);
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
    }
  };

  const parseImportText = (text: string): ParsedGroup | null => {
    try {
      const dateMatch = text.match(/📅\s*Date:\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i);
      if (!dateMatch) return null;

      const day = dateMatch[1].padStart(2, "0");
      const month = dateMatch[2].padStart(2, "0");
      let year = dateMatch[3];
      if (year.length === 2) {
        year = "20" + year;
      }
      const date = `${year}-${month}-${day}`;

      const participantsMatch = text.match(/👥\s*Total\s*Participants:\s*(\d+)/i);
      const totalParticipants = participantsMatch ? parseInt(participantsMatch[1]) : 0;

      const timeMatch = text.match(/\n(\d{1,2}:\d{2})\s*\n/);
      const time = timeMatch ? timeMatch[1] : "13:00";

      const groupLineMatch = text.match(/Group\s*(\d+)\s*[\t\s]+([^\n]+)/i);
      let currentMeetingPoint = groupLineMatch ? groupLineMatch[2].trim() : "";

      const bookingsList: ParsedBooking[] = [];
      const lines = text.split("\n");
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (/^[\t\s]{2,}[^\t\s📞📧👤🗣🔹🎟📅👥]/.test(line)) {
          const potentialPoint = line.trim();
          if (potentialPoint.length > 0 && 
              !potentialPoint.includes("|") && 
              !potentialPoint.includes("@") &&
              !potentialPoint.match(/^\d{1,2}:\d{2}$/)) {
            currentMeetingPoint = potentialPoint;
            continue;
          }
        }

        const phoneMatch = line.match(/📞\s*([+\d]+)/);
        const refMatch = line.match(/🔹\s*Booking\s*Ref:\s*(\w+)/i);

        if (phoneMatch && refMatch) {
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
    if (!parsedPreview || !user) {
      toast.error("Could not parse the text. Please check the format.");
      return;
    }

    setImporting(true);
    try {
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .insert({
          group_number: groupNumber,
          tour_date: parsedPreview.date,
          meeting_time: parsedPreview.time,
          total_participants: parsedPreview.total_participants,
          status: "pending",
          created_by: user.id,
          guide_id: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

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
      fetchGroups();
    } catch (error: any) {
      toast.error("Import failed: " + error.message);
    } finally {
      setImporting(false);
    }
  };

  const fetchGroups = async () => {
    if (!user) return;

    try {
      // Fetch groups assigned to this guide
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .eq('guide_id', user.id)
        .order('tour_date', { ascending: false });

      if (groupsError) throw groupsError;

      // Fetch bookings for these groups
      if (groupsData && groupsData.length > 0) {
        const groupIds = groupsData.map(g => g.id);
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('*')
          .in('group_id', groupIds);

        const groupsWithBookings = groupsData.map(group => ({
          ...group,
          bookings: bookingsData?.filter(b => b.group_id === group.id) || []
        }));

        setGroups(groupsWithBookings);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default" className="bg-green-500/20 text-green-600">Confirmed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'postponed':
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-600">Postponed</Badge>;
      case 'no_show':
        return <Badge variant="secondary" className="bg-orange-500/20 text-orange-600">No Show</Badge>;
      case 'problem':
        return <Badge variant="destructive" className="bg-red-500/20 text-red-600">Problem</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Group by date for display
  const groupsByDate = groups.reduce((acc, group) => {
    const date = group.tour_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(group);
    return acc;
  }, {} as Record<string, Group[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderBulkImportDialog = () => (
    <Dialog open={isBulkImportDialogOpen} onOpenChange={setIsBulkImportDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Bookings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Group Number</Label>
            <Input
              type="number"
              min="1"
              value={groupNumber}
              onChange={(e) => {
                setGroupNumber(parseInt(e.target.value) || 1);
                if (bulkImportText) {
                  handleBulkImportTextChange(bulkImportText);
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Paste Group Text</Label>
            <Textarea
              value={bulkImportText}
              onChange={(e) => handleBulkImportTextChange(e.target.value)}
              placeholder="Paste formatted data here..."
              className="min-h-[200px] font-mono text-xs"
            />
          </div>

          {parsedPreview && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Data Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>Date: {parsedPreview.date}</div>
                  <div>Time: {parsedPreview.time}</div>
                  <div>Group: {groupNumber}</div>
                  <div>Participants: {parsedPreview.total_participants}</div>
                </div>
                <div className="border-t pt-2">
                  <strong>{parsedPreview.bookings.length} bookings:</strong>
                  <ul className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                    {parsedPreview.bookings.map((b, i) => (
                      <li key={i} className="text-xs bg-muted p-1 rounded">
                        {b.customer_name} - {b.meeting_point} ({b.number_of_people}P)
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handleBulkImport}
            disabled={!parsedPreview || importing}
            className="w-full"
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
  );

  if (groups.length === 0 && !loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">My Groups</h2>
          </div>
          {renderBulkImportDialog()}
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No groups assigned to you yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              You can import bookings using the Bulk Import button
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">My Groups</h2>
          <Badge variant="secondary">{groups.length} groups</Badge>
        </div>
        {renderBulkImportDialog()}
      </div>

      {Object.entries(groupsByDate).map(([date, dateGroups]) => (
        <Card key={date}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {format(new Date(date), 'EEEE, MMMM d, yyyy')}
              <Badge variant="outline">{dateGroups.length} groups</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Accordion type="single" collapsible className="space-y-2">
              {dateGroups.map((group) => (
                <AccordionItem key={group.id} value={group.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary">Group {group.group_number}</Badge>
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {group.meeting_time}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {group.total_participants} people
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    {group.bookings && group.bookings.length > 0 ? (
                      <div className="space-y-3">
                        {group.bookings.map((booking) => (
                          <div
                            key={booking.id}
                            className={`p-3 rounded-lg border ${
                              booking.status === 'cancelled' ? 'bg-destructive/5 border-destructive/20' :
                              booking.status === 'problem' ? 'bg-destructive/5 border-destructive/20' :
                              booking.status === 'no_show' ? 'bg-orange-500/5 border-orange-500/20' :
                              booking.status === 'postponed' ? 'bg-blue-500/5 border-blue-500/20' :
                              'bg-muted/50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {booking.customer_name}
                                  </span>
                                  {getStatusBadge(booking.status)}
                                </div>
                                <div className="text-sm text-muted-foreground space-y-0.5">
                                  <p className="font-mono text-xs">Ref: {booking.booking_reference}</p>
                                  <div className="flex flex-wrap gap-3">
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {booking.number_of_people} people
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Globe className="h-3 w-3" />
                                      {booking.language}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {booking.meeting_point}
                                    </span>
                                  </div>
                                  {booking.phone && (
                                    <p className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      <a href={`tel:${booking.phone}`} className="text-primary hover:underline" dir="ltr">
                                        {booking.phone}
                                      </a>
                                    </p>
                                  )}
                                  {booking.email && (
                                    <p className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      <a href={`mailto:${booking.email}`} className="text-primary hover:underline">
                                        {booking.email}
                                      </a>
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No bookings in this group yet
                      </p>
                    )}
                    {group.notes && (
                      <div className="mt-3 p-2 bg-muted rounded text-sm">
                        <strong>Notes:</strong> {group.notes}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
