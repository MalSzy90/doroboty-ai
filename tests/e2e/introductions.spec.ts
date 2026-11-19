import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { STORAGE_KEY } from "../../src/features/introductions/scenario";

const route = "/#/prototyp/poznajmy-cie";

test("downloaded diagnostics omit error text and candidate answers", async ({ page }) => {
  await page.goto(route);
  await page.evaluate(() => {
    window.dispatchEvent(new ErrorEvent("error", { message: "TAJNA FIKCYJNA ODPOWIEDŹ" }));
  });
  await page.getByText("Kopia odpowiedzi i pytań", { exact: true }).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Pobierz raport techniczny" }).click();
  const report = await downloadEvent;
  const contents = (await readFile((await report.path())!)).toString();
  expect(contents).toContain('"code": "uncaught-error"');
  expect(contents).not.toContain("TAJNA FIKCYJNA ODPOWIEDŹ");
  expect(Object.keys(JSON.parse(contents).entries[0]).sort()).toEqual(["at", "code", "version"]);
});

test("candidate journey, prepared AI boundary and backup recovery", async ({ page }) => {
  await page.goto(route);
  await page.getByRole("button", { name: "Zaczynamy" }).click();
  await page.getByRole("button", { name: "Dalej" }).click();
  await expect(page.getByText("Dodaj odpowiedź, żeby przejść dalej.")).toBeVisible();
  for (let index = 0; index < 3; index++) {
    await page
      .getByRole("textbox")
      .fill(`Fikcyjna odpowiedź audytu ${index + 1}: sprawdzam źródła.`);
    await page
      .getByRole("button", {
        name:
          index === 2 ? /Przejdź do podsumowania|Sprawdź odpowiedzi|Zobacz podsumowanie/ : "Dalej",
      })
      .click();
  }
  await page.getByRole("button", { name: "Wyślij odpowiedzi" }).click();
  await expect(page.getByRole("heading", { name: /Dzięki, Marku/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: /Dzięki, Marku/ })).toBeVisible();
  await page.goto(`${route}?widok=pracodawca`);
  await expect(
    page.getByText("Dla tych odpowiedzi nie ma przygotowanego podsumowania."),
  ).toBeVisible();
  await page.getByLabel("Pytanie do rozmowy", { exact: true }).fill("Fikcyjne dopytanie do kopii");
  await page.getByRole("button", { name: "Zapisz pytanie", exact: true }).click();
  await expect(page.getByRole("button", { name: "Zapisano w makiecie" })).toBeVisible();
  await page.getByText("Kopia odpowiedzi i pytań", { exact: true }).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Pobierz kopię makiety" }).click();
  const backup = await downloadEvent;
  const bytes = await readFile((await backup.path())!);
  const saved = JSON.parse(bytes.toString());
  expect(saved.submitted.answers[0]).toContain("Fikcyjna odpowiedź audytu 1");
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Od nowa", exact: true }).click();
  await expect(page.getByRole("button", { name: "Zaczynamy" })).toBeVisible();
  await page
    .getByLabel("Wczytaj kopię makiety", { exact: false })
    .setInputFiles({ name: "copy.json", mimeType: "application/json", buffer: bytes });
  await expect(page.getByText("Wczytano kopię makiety.")).toBeVisible();
  await page.reload();
  await page.goto(`${route}?widok=pracodawca`);
  await expect(page.getByLabel("Pytanie do rozmowy", { exact: true })).toHaveValue(
    "Fikcyjne dopytanie do kopii",
  );
});

test("stale employer tab cannot overwrite a newer question or report successful saving", async ({
  page,
  context,
}) => {
  await page.goto(`${route}?widok=pytania`);
  const second = await context.newPage();
  await second.goto(`${route}?widok=pracodawca`);
  await page.locator("#pc-question-0").fill("Fikcyjne nowe pytanie z karty A");
  await page.getByRole("button", { name: "Zatwierdź zestaw" }).click();
  await expect(page.getByRole("button", { name: "Zatwierdzono", exact: true })).toBeVisible();
  await second.getByLabel("Pytanie do rozmowy", { exact: true }).fill("Notatka ze starej karty B");
  await second.getByRole("button", { name: "Zapisz pytanie", exact: true }).click();
  await expect(second.getByRole("alert")).toContainText("Dane zmieniły się w innej karcie");
  await expect(second.getByRole("button", { name: "Zapisano w makiecie" })).toHaveCount(0);
  await page.reload();
  await expect(page.locator("#pc-question-0")).toHaveValue("Fikcyjne nowe pytanie z karty A");
  second.on("dialog", (dialog) => dialog.accept());
  await second.getByRole("button", { name: "Od nowa", exact: true }).click();
  await expect(second.getByRole("alert")).toContainText("Dane zmieniły się w innej karcie");
  await page.reload();
  await expect(page.locator("#pc-question-0")).toHaveValue("Fikcyjne nowe pytanie z karty A");
});

test("invalid imports and failed writes preserve data and do not show a submission success", async ({
  page,
}) => {
  await page.goto(route);
  await page.getByText("Kopia odpowiedzi i pytań", { exact: true }).click();
  const upload = page.getByLabel("Wczytaj kopię makiety", { exact: false });
  await upload.setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":2}'),
  });
  await expect(page.getByRole("alert")).toContainText("Nieprawidłowa kopia");
  await expect(page.getByRole("button", { name: "Zaczynamy" })).toBeVisible();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Zaczynamy" }).click();
  for (let index = 0; index < 3; index++) {
    await page.getByRole("textbox").fill(`Fikcyjna odpowiedź ${index}`);
    await page
      .getByRole("button", {
        name:
          index === 2 ? /Przejdź do podsumowania|Sprawdź odpowiedzi|Zobacz podsumowanie/ : "Dalej",
      })
      .click();
  }
  await page.getByRole("button", { name: "Wyślij odpowiedzi" }).click();
  await expect(page.getByRole("alert")).toContainText("Wyeksportuj");
  await expect(page.getByRole("heading", { name: /Dzięki, Marku/ })).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

test("recovery controls fit mobile, support keyboard and load local CV and phone frame", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route);
  await page.getByText("Kopia odpowiedzi i pytań", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Wczytaj kopię makiety", { exact: false })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Pobierz kopię makiety" })).toBeFocused();
  for (const width of [320, 390, 600, 700, 950, 1150, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
  }
  await page.getByRole("tab", { name: "CV", exact: true }).click();
  const href = await page.getByRole("link", { name: "Otwórz przykładowe CV" }).getAttribute("href");
  const response = await page.request.get(href!);
  expect(response.ok()).toBe(true);
  expect((await response.body()).subarray(0, 5).toString()).toBe("%PDF-");
  await page.getByRole("link", { name: "Telefon", exact: true }).click();
  await expect(
    page.frameLocator("iframe").getByRole("button", { name: "Zaczynamy" }),
  ).toBeVisible();
});

test("portal persistence also refuses a stale profile update", async ({ page, context }) => {
  await page.goto("/#/auth/sign-in");
  await page.getByRole("button", { name: "Wejdź jako Anna Kowalska", exact: true }).click();
  await page.goto("/#/app/profil");
  const second = await context.newPage();
  await second.goto("/#/app/profil");
  await page.getByLabel("Imię i nazwisko").fill("Fikcyjna Anna A");
  await page.getByRole("button", { name: "Zapisz profil", exact: true }).click();
  await expect(page.getByText("Profil został zapisany.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Imię i nazwisko")).toHaveValue("Fikcyjna Anna A");
  await second.getByLabel("Imię i nazwisko").fill("Fikcyjna Anna B");
  await second.getByRole("button", { name: "Zapisz profil", exact: true }).click();
  await expect(
    second.getByRole("status").filter({ hasText: "Dane zmieniły się w innej karcie" }),
  ).toBeVisible();
  await expect(second.getByText("Profil został zapisany.", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Imię i nazwisko")).toHaveValue("Fikcyjna Anna A");
});
