import { toast } from "sonner";
import { PasswordForm } from "@/app/PasswordForm";
import { closeSheet } from "@/app/route";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui/button";
import { useData } from "@/data/data";
import { C } from "@/domain/copy.js";

// Change password: the onboarding form in a sheet, without the skip link. It asks for the current password when Firebase needs it.
export function PasswordSheet() {
  const { people } = useData(), close = () => closeSheet("#/settings/profile");
  return (
    <Sheet title={C.changePw} onClose={close}
      headerAction={<Button variant="ghost" className="h-11 text-body" data-act="close" onClick={close}>{C.cancel}</Button>}>
      <PasswordForm them={people.names[people.them]} onDone={() => { toast.success(C.pwSaved); close(); }} />
    </Sheet>
  );
}
