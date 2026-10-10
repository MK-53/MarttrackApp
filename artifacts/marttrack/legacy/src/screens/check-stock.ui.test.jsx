import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { DARK_COLORS } from "../constants/colors";
import { MartTrackContext } from "../state/MartTrackContext";
import InventoryScreen from "./InventoryScreen";
import EditItemScreen from "./EditItemScreen";
import SellScreen from "./SellScreen";
import AddStockScreen from "./AddStockScreen";
import EditBatchScreen from "./EditBatchScreen";
import BusinessBriefingScreen from "./BusinessBriefingScreen";
import SupplierQuotesScreen from "./SupplierQuotesScreen";

const state = {
  schemaVersion: 1,
  items: [
    { id: 1, item_name: "Peaches", target_price_per_unit: 5.5, sell_unit_type: "unit" },
    { id: 2, item_name: "Rice", target_price_per_unit: 9, sell_unit_type: "bag" },
    { id: 3, item_name: "Archived flour", target_price_per_unit: 4, sell_unit_type: "bag", archived: true },
  ],
  batches: [
    { id: 1, item_id: 1, initial_qty: 12, qty_remaining: 10, cost_per_unit: 2 },
    { id: 2, item_id: 2, initial_qty: 7, qty_remaining: 3, cost_per_unit: 4 },
    { id: 3, item_id: 3, initial_qty: 5, qty_remaining: 0, cost_per_unit: 1.5 },
  ],
  sales: [
    { id: 1, item_id: 1, batch_id: 1, qty_sold: 2, profit: 6 },
    { id: 2, item_id: 2, batch_id: 2, qty_sold: 4, profit: 5 },
  ],
  editHistory: [],
  counters: { itemId: 4, batchId: 4, saleId: 3, editId: 1 },
  settings: { theme: "dark" },
};

function renderWithState(screen, onNavigate = jest.fn(), stateOverride = state) {
  return {
    onNavigate,
    ...render(
      <MartTrackContext.Provider
        value={{
          state: stateOverride,
          dispatch: jest.fn(),
          isLoading: false,
          theme: "dark",
          colors: DARK_COLORS,
        }}
      >
        {screen(onNavigate)}
      </MartTrackContext.Provider>,
    ),
  };
}

test("keeps expanded Check Stock details and edit routes tied to the matching good", () => {
  const { onNavigate } = renderWithState(
    navigate => <InventoryScreen onNavigate={navigate} />,
  );

  fireEvent.press(screen.getByTestId("check-stock-details-1"));
  expect(screen.getByText("12 unit")).toBeTruthy();
  expect(screen.getByText("10 unit")).toBeTruthy();
  expect(screen.getByText("$5.50")).toBeTruthy();
  expect(screen.getByText("$20.00")).toBeTruthy();
  expect(screen.getByText("+$6.00")).toBeTruthy();

  fireEvent.press(screen.getByTestId("check-stock-details-2"));
  expect(screen.queryByText("12 unit")).toBeNull();
  expect(screen.getByText("7 bag")).toBeTruthy();
  expect(screen.getByText("3 bag")).toBeTruthy();
  expect(screen.getByText("$9.00")).toBeTruthy();
  expect(screen.getByText("$12.00")).toBeTruthy();
  expect(screen.getByText("+$5.00")).toBeTruthy();

  fireEvent.press(screen.getByTestId("check-stock-edit-2"));
  expect(onNavigate).toHaveBeenCalledWith("edit", { itemId: 2 });
});

test("opens active and archived goods in their matching editor and excludes archived goods from selling", () => {
  const { onNavigate } = renderWithState(
    navigate => <InventoryScreen onNavigate={navigate} />,
  );

  fireEvent.press(screen.getByTestId("check-stock-details-1"));
  fireEvent.press(screen.getByTestId("check-stock-edit-1"));
  expect(onNavigate).toHaveBeenCalledWith("edit", { itemId: 1 });

  const activeEditor = renderWithState(
    navigate => <EditItemScreen onNavigate={navigate} initialItemId={1} />,
  );
  expect(screen.getByText("Editing: Peaches")).toBeTruthy();
  expect(screen.getByText("Name: Peaches")).toBeTruthy();
  activeEditor.unmount();

  const { onNavigate: archivedNavigate } = renderWithState(
    navigate => <InventoryScreen onNavigate={navigate} />,
  );
  fireEvent.press(screen.getByTestId("check-stock-details-3"));
  fireEvent.press(screen.getByTestId("check-stock-edit-3"));
  expect(archivedNavigate).toHaveBeenCalledWith("edit", { itemId: 3 });

  const archivedEditor = renderWithState(
    navigate => <EditItemScreen onNavigate={navigate} initialItemId={3} />,
  );
  expect(screen.getByText("Editing: Archived flour")).toBeTruthy();
  expect(screen.getByText("Name: Archived flour")).toBeTruthy();
  archivedEditor.unmount();

  renderWithState(navigate => <SellScreen onNavigate={navigate} />);
  expect(screen.getByText("Peaches")).toBeTruthy();
  expect(screen.getByText("Rice")).toBeTruthy();
  expect(screen.queryByText("Archived flour")).toBeNull();
});

test("opens the Restock screen without crashing", () => {
  renderWithState(navigate => <AddStockScreen onNavigate={navigate} />);

  expect(screen.getByText("New Stock Batch")).toBeTruthy();
  expect(screen.getByText("Save Batch")).toBeTruthy();
});

test("shows the affected-sales choice when correcting a used batch", () => {
  renderWithState(navigate => <EditBatchScreen onNavigate={navigate} />);

  fireEvent.press(screen.getByTestId("edit-batch-1"));

  expect(screen.getByText("1 sale(s) already used this batch's original cost")).toBeTruthy();
  expect(screen.getByTestId("edit-batch-recalculate-switch")).toBeTruthy();
  expect(screen.getByText("Save Correction")).toBeTruthy();
});

test("opens the Business Briefing with analytics from local state", () => {
  const analyticsState = {
    ...state,
    items: [{ id: 1, item_name: "Peaches", target_price_per_unit: 5.5, sell_unit_type: "unit" }],
    batches: [{ id: 1, item_id: 1, initial_qty: 12, qty_remaining: 10, cost_per_unit: 2, timestamp: "2026-01-01T00:00:00.000Z" }],
    sales: [{
      id: 1,
      item_id: 1,
      batch_id: 1,
      qty_sold: 2,
      sale_price: 5.5,
      revenue: 11,
      cogs: 4,
      profit: 7,
      timestamp: "2026-01-06T00:00:00.000Z",
    }],
  };

  renderWithState(navigate => <BusinessBriefingScreen onNavigate={navigate} />, jest.fn(), analyticsState);

  expect(screen.getByText("Business Briefing")).toBeTruthy();
  expect(screen.getAllByText("Peaches").length).toBeGreaterThan(0);
  expect(screen.getByTestId("briefing-trend-week")).toBeTruthy();
});

test("opens Supplier Quotes and shows the quote form", () => {
  renderWithState(navigate => <SupplierQuotesScreen onNavigate={navigate} />);

  expect(screen.getByText("Supplier Quotes")).toBeTruthy();
  expect(screen.getByTestId("supplier-item-1")).toBeTruthy();
  expect(screen.getByText("Save Supplier Quote")).toBeTruthy();
});