import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Database } from "@/lib/schema";
import Image from "next/image";
import { useState } from "react";
import EditSpeciesDialog from "./edit-species-dialog";

type Species = Database["public"]["Tables"]["species"]["Row"] & {
  profiles: { display_name: string } | null;
};

export default function SpeciesDetailsDialog({ species, userId }: { species: Species; userId: string }) {
  // Control open/closed state of the dialog
  const [open, setOpen] = useState<boolean>(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Learn More</Button>
      </DialogTrigger>
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{species.scientific_name}</DialogTitle>
          <DialogDescription>
            {species.common_name && <span className="mb-2 block text-base italic">{species.common_name}</span>}
            {species.image && (
              <div className="relative mb-4 h-96 w-full overflow-hidden rounded-lg">
                <Image src={species.image} alt={species.scientific_name} fill style={{ objectFit: "cover" }} />
              </div>
            )}
            {species.total_population && (
              <span className="mb-1 block text-sm">Total Population: {species.total_population.toLocaleString()}</span>
            )}
            {species.kingdom && <span className="mb-2 block text-sm font-semibold">Kingdom: {species.kingdom}</span>}
            {species.profiles?.display_name && (
              <span className="mb-2 block text-sm">
                Author: {species.profiles.display_name} {species.author === userId && <span className="text-blue-600">(You)</span>}
              </span>
            )}
            {species.description && <span className="mt-3 block text-sm leading-relaxed">{species.description}</span>}
          </DialogDescription>
        </DialogHeader>
        {species.author === userId && (
          <div className="mt-4 flex justify-end">
            <EditSpeciesDialog userId={userId} species={species} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
