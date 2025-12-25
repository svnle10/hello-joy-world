import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Clock, MapPin, Calendar, Phone, Mail, Globe, User } from 'lucide-react';
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

  useEffect(() => {
    fetchGroups();
  }, [user]);

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

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No groups assigned to you yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            When admin assigns groups to you, they will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">My Groups</h2>
        <Badge variant="secondary">{groups.length} groups</Badge>
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
