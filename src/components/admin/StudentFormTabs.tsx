import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, X, Fingerprint, Building2, Home } from "lucide-react";
import HousesDialog from "./HousesDialog";
import SchoolSectionsDialog from "./SchoolSectionsDialog";

interface ClassOption {
  id: string;
  name: string;
  section: string | null;
}

interface SchoolSection {
  id: string;
  name: string;
}

interface House {
  id: string;
  name: string;
}

interface Session {
  id: string;
  name: string;
  is_current: boolean;
}

export interface StudentFormData {
  // Part 1: Primary Data
  student_id: string;
  full_name: string;
  father_name: string;
  address: string;
  date_of_birth: string;
  admission_date: string;
  admission_class_id: string;
  current_session_id: string;
  current_class_id: string;
  school_section_id: string;
  
  // Part 2: Identity
  photo_url: string | null;
  religion: string;
  nationality: string;
  gender: string;
  
  // Part 3: Secondary Data Part 1
  father_occupation: string;
  father_cnic: string;
  father_phone: string;
  blood_group: string;
  health_notes: string;
  house_id: string;
  
  // Part 4: Secondary Data Part 2
  domicile: string;
  hostel_facility: boolean;
  transport_facility: boolean;
  is_from_previous_school: boolean;
  previous_school: string;
  previous_school_admission_no: string;
  school_leaving_number: string;
  school_leaving_date: string;
  
  // Auth
  password: string;
}

interface StudentFormTabsProps {
  formData: StudentFormData;
  setFormData: React.Dispatch<React.SetStateAction<StudentFormData>>;
  classes: ClassOption[];
  lastStudentId: string | null;
  getNextStudentId: (lastId: string | null) => string;
  photoFile: File | null;
  setPhotoFile: (file: File | null) => void;
  photoPreview: string | null;
  setPhotoPreview: (url: string | null) => void;
  adminName: string;
}

const StudentFormTabs = ({
  formData,
  setFormData,
  classes,
  lastStudentId,
  getNextStudentId,
  photoFile,
  setPhotoFile,
  photoPreview,
  setPhotoPreview,
  adminName,
}: StudentFormTabsProps) => {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("primary");
  const [schoolSections, setSchoolSections] = useState<SchoolSection[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [housesDialogOpen, setHousesDialogOpen] = useState(false);
  const [sectionsDialogOpen, setSectionsDialogOpen] = useState(false);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    const [sectionsRes, housesRes, sessionsRes] = await Promise.all([
      supabase.from("school_sections").select("id, name").eq("is_active", true).order("name"),
      supabase.from("houses").select("id, name").eq("is_active", true).order("name"),
      supabase.from("academic_years").select("id, name, is_current").order("start_date", { ascending: false }),
    ]);

    if (sectionsRes.data) setSchoolSections(sectionsRes.data);
    if (housesRes.data) setHouses(housesRes.data);
    if (sessionsRes.data) {
      setSessions(sessionsRes.data);
      // Set current session as default if not set
      const currentSession = sessionsRes.data.find(s => s.is_current);
      if (currentSession && !formData.current_session_id) {
        setFormData(prev => ({ ...prev, current_session_id: currentSession.id }));
      }
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const updateField = (field: keyof StudentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="primary" className="text-xs sm:text-sm">Primary</TabsTrigger>
          <TabsTrigger value="identity" className="text-xs sm:text-sm">Identity</TabsTrigger>
          <TabsTrigger value="secondary1" className="text-xs sm:text-sm">Secondary 1</TabsTrigger>
          <TabsTrigger value="secondary2" className="text-xs sm:text-sm">Secondary 2</TabsTrigger>
        </TabsList>

        {/* Part 1: Primary Data */}
        <TabsContent value="primary" className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Student ID *</Label>
              <Input
                value={formData.student_id}
                onChange={(e) => updateField("student_id", e.target.value.toUpperCase())}
                placeholder="e.g., 101"
                required
              />
              <div className="flex items-center justify-between">
                {lastStudentId && (
                  <p className="text-xs text-muted-foreground">
                    Last: <span className="font-semibold text-primary">{lastStudentId}</span>
                  </p>
                )}
                {lastStudentId && (
                  <Button 
                    type="button" 
                    variant="link" 
                    size="sm" 
                    className="text-xs h-auto p-0"
                    onClick={() => updateField("student_id", getNextStudentId(lastStudentId))}
                  >
                    Use next
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="Min. 6 characters"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Student Name *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => updateField("full_name", e.target.value)}
                placeholder="Student's full name"
                required
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Father Name *</Label>
              <Input
                value={formData.father_name}
                onChange={(e) => updateField("father_name", e.target.value)}
                placeholder="Father's full name"
                required
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Address *</Label>
              <Input
                value={formData.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Full address"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth *</Label>
              <Input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => updateField("date_of_birth", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Date of Admission *</Label>
              <Input
                type="date"
                value={formData.admission_date}
                onChange={(e) => updateField("admission_date", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Class of Admission</Label>
              <Select value={formData.admission_class_id} onValueChange={(v) => updateField("admission_class_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{c.section ? ` - ${c.section}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Current Session *</Label>
              <Select value={formData.current_session_id} onValueChange={(v) => updateField("current_session_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                <SelectContent>
                  {sessions.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.is_current && "(Current)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Current Class</Label>
              <Select value={formData.current_class_id} onValueChange={(v) => updateField("current_class_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{c.section ? ` - ${c.section}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>School Section</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={() => setSectionsDialogOpen(true)}
                >
                  <Building2 className="w-3 h-3 mr-1" /> Manage
                </Button>
              </div>
              <Select value={formData.school_section_id} onValueChange={(v) => updateField("school_section_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {schoolSections.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        {/* Part 2: Student Identity */}
        <TabsContent value="identity" className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            {/* Fingerprint Placeholder */}
            <div className="col-span-2 border-2 border-dashed rounded-lg p-6 text-center bg-muted/30">
              <Fingerprint className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-muted-foreground">Fingerprint Setup</p>
              <p className="text-xs text-muted-foreground">Biometric integration coming soon</p>
            </div>

            {/* Student Photo */}
            <div className="col-span-2 space-y-2">
              <Label>Student Photo</Label>
              <div className="flex items-center gap-4">
                {photoPreview ? (
                  <div className="relative">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={photoPreview} />
                      <AvatarFallback>Photo</AvatarFallback>
                    </Avatar>
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 w-6 h-6"
                      onClick={clearPhoto}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="w-24 h-24 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">Upload</span>
                  </div>
                )}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <div>
                  <p className="text-sm font-medium">Upload passport-size photo</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG (Max 2MB)</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Religion</Label>
              <Select value={formData.religion} onValueChange={(v) => updateField("religion", v)}>
                <SelectTrigger><SelectValue placeholder="Select religion" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Islam">Islam</SelectItem>
                  <SelectItem value="Christianity">Christianity</SelectItem>
                  <SelectItem value="Hinduism">Hinduism</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nationality</Label>
              <Input
                value={formData.nationality}
                onChange={(e) => updateField("nationality", e.target.value)}
                placeholder="e.g., Pakistani"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Gender *</Label>
              <Select value={formData.gender} onValueChange={(v) => updateField("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        {/* Part 3: Secondary Data Part 1 */}
        <TabsContent value="secondary1" className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Father Occupation</Label>
              <Input
                value={formData.father_occupation}
                onChange={(e) => updateField("father_occupation", e.target.value)}
                placeholder="e.g., Teacher, Engineer"
              />
            </div>
            <div className="space-y-2">
              <Label>Father CNIC *</Label>
              <Input
                value={formData.father_cnic}
                onChange={(e) => updateField("father_cnic", e.target.value)}
                placeholder="12345-1234567-1"
                required
              />
              <p className="text-xs text-muted-foreground">Used for parent login</p>
            </div>
            <div className="space-y-2">
              <Label>Father Mobile *</Label>
              <Input
                value={formData.father_phone}
                onChange={(e) => updateField("father_phone", e.target.value)}
                placeholder="+92 300 1234567"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Blood Group</Label>
              <Select value={formData.blood_group} onValueChange={(v) => updateField("blood_group", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>House</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={() => setHousesDialogOpen(true)}
                >
                  <Home className="w-3 h-3 mr-1" /> Manage
                </Button>
              </div>
              <Select value={formData.house_id} onValueChange={(v) => updateField("house_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select house" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {houses.map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Health Notes</Label>
              <Input
                value={formData.health_notes}
                onChange={(e) => updateField("health_notes", e.target.value)}
                placeholder="Any health conditions or allergies"
              />
            </div>
          </div>
        </TabsContent>

        {/* Part 4: Secondary Data Part 2 */}
        <TabsContent value="secondary2" className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Domicile</Label>
              <Select value={formData.domicile} onValueChange={(v) => updateField("domicile", v)}>
                <SelectTrigger><SelectValue placeholder="Select province" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Punjab">Punjab</SelectItem>
                  <SelectItem value="Sindh">Sindh</SelectItem>
                  <SelectItem value="KPK">KPK</SelectItem>
                  <SelectItem value="Balochistan">Balochistan</SelectItem>
                  <SelectItem value="Islamabad">Islamabad</SelectItem>
                  <SelectItem value="AJK">AJK</SelectItem>
                  <SelectItem value="GB">Gilgit-Baltistan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hostel Facility</Label>
              <Select 
                value={formData.hostel_facility ? "yes" : "no"} 
                onValueChange={(v) => updateField("hostel_facility", v === "yes")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Transport Facility</Label>
              <Select 
                value={formData.transport_facility ? "yes" : "no"} 
                onValueChange={(v) => updateField("transport_facility", v === "yes")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Admin</Label>
              <Input value={adminName} disabled className="bg-muted" />
            </div>

            {/* New Student / From Previous School */}
            <div className="col-span-2 space-y-3 pt-2">
              <Label>Student Type</Label>
              <RadioGroup 
                value={formData.is_from_previous_school ? "previous" : "new"}
                onValueChange={(v) => updateField("is_from_previous_school", v === "previous")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new-student" />
                  <Label htmlFor="new-student" className="font-normal cursor-pointer">New Student</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="previous" id="previous-school" />
                  <Label htmlFor="previous-school" className="font-normal cursor-pointer">From Previous School</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Previous School Fields (conditional) */}
            {formData.is_from_previous_school && (
              <>
                <div className="col-span-2 border-t pt-4 mt-2">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Previous School Information</p>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Previous School Name</Label>
                  <Input
                    value={formData.previous_school}
                    onChange={(e) => updateField("previous_school", e.target.value)}
                    placeholder="Name of previous school"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Previous Admission No.</Label>
                  <Input
                    value={formData.previous_school_admission_no}
                    onChange={(e) => updateField("previous_school_admission_no", e.target.value)}
                    placeholder="Previous school admission number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>School Leaving No.</Label>
                  <Input
                    value={formData.school_leaving_number}
                    onChange={(e) => updateField("school_leaving_number", e.target.value)}
                    placeholder="School leaving certificate number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>School Leaving Date</Label>
                  <Input
                    type="date"
                    value={formData.school_leaving_date}
                    onChange={(e) => updateField("school_leaving_date", e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Houses Dialog */}
      <HousesDialog 
        open={housesDialogOpen} 
        onOpenChange={setHousesDialogOpen}
        onHousesChange={() => {
          supabase.from("houses").select("id, name").eq("is_active", true).order("name")
            .then(({ data }) => { if (data) setHouses(data); });
        }}
      />

      {/* School Sections Dialog */}
      <SchoolSectionsDialog 
        open={sectionsDialogOpen} 
        onOpenChange={setSectionsDialogOpen}
        onSectionsChange={() => {
          supabase.from("school_sections").select("id, name").eq("is_active", true).order("name")
            .then(({ data }) => { if (data) setSchoolSections(data); });
        }}
      />
    </>
  );
};

export default StudentFormTabs;
