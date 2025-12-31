import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Calendar, Users } from "lucide-react";
import { format } from "date-fns";
import { useN8nWebhooks } from "@/hooks/useN8nWebhooks";

interface Guide {
  user_id: string;
  full_name: string;
}

interface Assignment {
  id: string;
  guide_id: string;
  group_number: number;
  assignment_date: string;
  guide_name?: string;
}

const DailyAssignments = () => {
  const { logDailyAssignment } = useN8nWebhooks();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedGuide, setSelectedGuide] = useState("");
  const [groupNumber, setGroupNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all guides
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "guide");

      const guideIds = (rolesData || []).map((r) => r.user_id);

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", guideIds);

      setGuides(profilesData || []);

      // Fetch assignments for selected date
      const { data: assignmentsData } = await supabase
        .from("daily_assignments")
        .select("*")
        .eq("assignment_date", selectedDate)
        .order("group_number");

      // Enrich with guide names
      const enrichedAssignments = (assignmentsData || []).map((a) => ({
        ...a,
        guide_name: profilesData?.find((g) => g.user_id === a.guide_id)?.full_name || "Unknown",
      }));

      setAssignments(enrichedAssignments);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!selectedGuide || !groupNumber) {
      toast.error("Please select a guide and enter a group number");
      return;
    }

    const groupNum = parseInt(groupNumber);
    if (isNaN(groupNum) || groupNum < 1) {
      toast.error("Please enter a valid group number");
      return;
    }

    // Check if guide already assigned for this date
    if (assignments.some((a) => a.guide_id === selectedGuide)) {
      toast.error("This guide is already assigned for this date");
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("daily_assignments").insert({
        guide_id: selectedGuide,
        assignment_date: selectedDate,
        group_number: groupNum,
        created_by: userData.user?.id,
      });

      if (error) throw error;

      // Get guide name for webhook
      const guideName = guides.find(g => g.user_id === selectedGuide)?.full_name || '';
      
      // Log to n8n Daily Assignments webhook
      logDailyAssignment({
        assignment_date: selectedDate,
        guide_id: selectedGuide,
        guide_name: guideName,
        group_number: groupNum,
      }, 'add');

      toast.success("Assignment added successfully");
      setSelectedGuide("");
      setGroupNumber("");
      fetchData();
    } catch (error: any) {
      console.error("Error adding assignment:", error);
      toast.error(error.message || "Error adding assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      const { error } = await supabase
        .from("daily_assignments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Assignment removed");
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch (error: any) {
      console.error("Error deleting assignment:", error);
      toast.error(error.message || "Error removing assignment");
    }
  };

  // Get guides not yet assigned for this date
  const availableGuides = guides.filter(
    (g) => !assignments.some((a) => a.guide_id === g.user_id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Assignments
          </CardTitle>
          <CardDescription>
            Assign guides to groups for each working day
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Selection */}
          <div className="flex items-center gap-4">
            <Label>Select Date:</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-48"
            />
            <Badge variant="secondary" className="ml-auto">
              <Users className="h-3 w-3 mr-1" />
              {assignments.length} guides assigned
            </Badge>
          </div>

          {/* Add Assignment Form */}
          <div className="flex items-end gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1 space-y-2">
              <Label>Select Guide</Label>
              <Select value={selectedGuide} onValueChange={setSelectedGuide}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a guide..." />
                </SelectTrigger>
                <SelectContent>
                  {availableGuides.map((guide) => (
                    <SelectItem key={guide.user_id} value={guide.user_id}>
                      {guide.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32 space-y-2">
              <Label>Group #</Label>
              <Input
                type="number"
                min="1"
                value={groupNumber}
                onChange={(e) => setGroupNumber(e.target.value)}
                placeholder="1"
              />
            </div>
            <Button onClick={handleAddAssignment} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </>
              )}
            </Button>
          </div>

          {/* Assignments Table */}
          {assignments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead>Guide Name</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        Group {assignment.group_number}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {assignment.guide_name}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteAssignment(assignment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No guides assigned for this date yet.
            </div>
          )}

          {/* Available Guides */}
          {availableGuides.length > 0 && assignments.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                Guides not assigned ({availableGuides.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {availableGuides.map((guide) => (
                  <Badge key={guide.user_id} variant="secondary">
                    {guide.full_name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyAssignments;
