import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { User, Mail, Phone, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const { user, loading: authLoading, roles } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          phone: data.phone || '',
        });
      }

      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        phone: formData.phone,
      })
      .eq('id', user.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      setProfile(prev => prev ? { ...prev, ...formData } : null);
    }

    setSaving(false);
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <MainLayout showFooter={false}>
      <div className="container py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>

        <div className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your basic account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <p className="font-medium">{profile?.full_name || 'No name set'}</p>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  <div className="flex gap-2 mt-2">
                    {roles.map(role => (
                      <Badge key={role} variant="secondary" className="capitalize">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="pl-10"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={profile?.email || ''}
                      disabled
                      className="pl-10 bg-muted"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="pl-10"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Account Roles</CardTitle>
              <CardDescription>Your permissions and access levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {roles.includes('sender') && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Sender</p>
                      <p className="text-sm text-muted-foreground">Can create and track delivery orders</p>
                    </div>
                    <Badge>Active</Badge>
                  </div>
                )}
                {roles.includes('rider') && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Rider</p>
                      <p className="text-sm text-muted-foreground">Can accept and deliver orders</p>
                    </div>
                    <Badge>Active</Badge>
                  </div>
                )}
                {roles.includes('admin') && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Administrator</p>
                      <p className="text-sm text-muted-foreground">Full access to manage the platform</p>
                    </div>
                    <Badge className="bg-primary">Active</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}