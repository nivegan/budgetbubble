//
// 📄 NEW FILE: figmav1/src/components/AssetsLedgers.tsx
//
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Holdings } from './Holdings';
import { IouTracker } from './IouTracker';
import { GiftTracker } from './GiftTracker';

export function AssetsLedgers(props: any) {
  return (
    <Tabs defaultValue="holdings" className="w-full">
      <TabsList className="bg-[#34495e] border-[#577189]">
        <TabsTrigger value="holdings" className="data-[state=active]:bg-[#3d5a80] data-[state=active]:text-white">
          Holdings
        </TabsTrigger>
        <TabsTrigger value="iou" className="data-[state=active]:bg-[#3d5a80] data-[state=active]:text-white">
          IOU Ledger
        </TabsTrigger>
        <TabsTrigger value="gifts" className="data-[state=active]:bg-[#3d5a80] data-[state=active]:text-white">
          Gift Tracker
        </TabsTrigger>
      </TabsList>
      <TabsContent value="holdings" className="mt-6">
        <Holdings {...props} />
      </TabsContent>
      <TabsContent value="iou" className="mt-6">
        <IouTracker {...props} />
      </TabsContent>
      <TabsContent value="gifts" className="mt-6">
        <GiftTracker {...props} />
      </TabsContent>
    </Tabs>
  );
}