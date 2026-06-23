import { UserSettings } from "@/components/user/UserSettings";
import { PageBody, PageHeader } from "@/components/ui/PageHeader";

export const metadata = {
  title: "Settings · Nabi Registry",
};

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Personal preferences for this browser."
      />
      <PageBody>
        <UserSettings />
      </PageBody>
    </>
  );
}
