interface SlotSelectorProps {
  onSelectSlot?: (time: string) => void;
}

const SlotSelector = ({ onSelectSlot }: SlotSelectorProps) => {
  return (
    <div className="p-4 border rounded-md bg-card">
      <h3 className="text-lg font-semibold text-card-foreground">
        Selector de Horarios
      </h3>
    </div>
  );
};

export default SlotSelector;
