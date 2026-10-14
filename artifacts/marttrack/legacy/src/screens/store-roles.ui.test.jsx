import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { DARK_COLORS } from "../constants/colors";
import { MartTrackContext } from "../state/MartTrackContext";
import InventoryScreen from "./InventoryScreen";
import MoreScreen from "./MoreScreen";

const sellerState = {
  items: [{ id: 1, item_name: "Rice", target_price_per_unit: 4, sell_unit_type: "bag" }],
  batches: [{ id: 1, item_id: 1, initial_qty: 6, qty_remaining: 4, cost_per_unit: 2 }],
  sales: [{ id: 1, item_id: 1, qty_sold: 2, profit: 4, cogs: 4 }],
  editHistory: [],
  suppliers: [],
  settings: { theme: "dark" },
};

const renderSellerScreen = component =>
  render(
    <MartTrackContext.Provider
      value={{
        state: sellerState,
        isOwner: false,
        isConnected: true,
        activeStore: { id: "shared-shop", role: "seller", location: "pc", name: "Main shop" },
        colors: DARK_COLORS,
      }}
    >
      {component}
    </MartTrackContext.Provider>,
  );

test("seller stock screen hides financial details and item editing", () => {
  renderSellerScreen(<InventoryScreen onNavigate={jest.fn()} />);

  expect(screen.getByText("Rice")).toBeTruthy();
  expect(screen.getByText(/4 bag/)).toBeTruthy();
  expect(screen.queryByText(/Average cost/)).toBeNull();
  expect(screen.queryByText("Making profit")).toBeNull();
  expect(screen.queryByText("+$4.00")).toBeNull();

  fireEvent.press(screen.getByTestId("check-stock-details-1"));
  expect(screen.queryByText("Stock value")).toBeNull();
  expect(screen.queryByTestId("check-stock-edit-1")).toBeNull();
});

test("seller More menu only exposes store switching, not owner financial tools", () => {
  renderSellerScreen(<MoreScreen onNavigate={jest.fn()} />);

  expect(screen.getByText("Store and Team")).toBeTruthy();
  expect(screen.queryByText("Business Briefing")).toBeNull();
  expect(screen.queryByText("Supplier Quotes")).toBeNull();
  expect(screen.queryByText("Returns")).toBeNull();
  expect(screen.queryByText("History")).toBeNull();
  expect(screen.queryByText("Settings")).toBeNull();
});
