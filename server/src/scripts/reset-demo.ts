/**
 * Full reset of the demo data: drops the users, conversations and messages
 * collections, rebuilds their indexes, then inserts believable demo content.
 * Safe to run repeatedly. Needs MONGODB_URI and DEMO_RESET_ALLOWED=true, and refuses any
 * database but "ping" (demo-reset-guard.ts). `--check` runs the guard only and touches nothing.
 *
 * Login is passwordless (phone + name), so the demo accounts are listed in the README.
 */
import mongoose, { Types } from "mongoose";
import { Conversation } from "../modules/conversations/conversation.model.js";
import { Message } from "../modules/messages/message.model.js";
import { User } from "../modules/users/user.model.js";
import { demoResetRefusal } from "./demo-reset-guard.js";

const MINUTE = 60_000;

const DEMO_USERS = [
  { name: "Demo User", phone: "+15550100001" },
  { name: "Amira Rahman", phone: "+15550100002" },
  { name: "Daniel Okafor", phone: "+15550100003" },
  { name: "Sofia Martins", phone: "+15550100004" },
  { name: "Kenji Watanabe", phone: "+15550100005" },
];

type Line = [from: number, text: string];

const DIRECT_CHATS: { users: [number, number]; lines: Line[] }[] = [
  {
    users: [0, 1],
    lines: [
      [1, "Hey! Did you get a chance to look at the new landing page?"],
      [0, "Yes, it looks great. The hero section loads really fast now."],
      [1, "Nice, I switched the images to WebP."],
      [0, "That explains it. Can we ship it today?"],
      [1, "Sure, I'll open the PR after lunch."],
    ],
  },
  {
    users: [0, 2],
    lines: [
      [2, "Are we still on for the 3pm sync?"],
      [0, "Yes, I'll send the agenda in a few minutes."],
      [2, "Perfect. I'll bring the latency numbers."],
    ],
  },
  {
    users: [3, 0],
    lines: [
      [3, "Thanks for the intro to the design team!"],
      [0, "Anytime. They're a great group."],
    ],
  },
];

const GROUPS: { name: string; admin: number; members: number[]; lines: Line[] }[] = [
  {
    name: "Weekend Hike",
    admin: 1,
    members: [0, 1, 2, 4],
    lines: [
      [1, "Forecast looks clear for Saturday. Meet at 7am at the trailhead?"],
      [2, "I'm in. I'll bring the thermos."],
      [4, "Count me in too. Anyone driving from the city?"],
      [0, "I can take two people."],
      [1, "Great, we have a plan."],
    ],
  },
  {
    name: "Project Ping",
    admin: 0,
    members: [0, 1, 3],
    lines: [
      [0, "Welcome to the team channel. Share updates here."],
      [3, "Wireframes for the settings screen are ready for review."],
      [1, "Looking now, will leave comments in the doc."],
    ],
  },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  const refusal = demoResetRefusal(process.env);
  if (refusal) {
    console.error(`Refusing demo reset: ${refusal}`);
    process.exit(1);
  }
  if (process.argv.includes("--check")) {
    console.log("Demo reset allowed for this database (check only, nothing changed).");
    return;
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });

  // Drop (ignoring "ns not found" on a fresh database), then rebuild the indexes.
  for (const model of [Message, Conversation, User]) {
    await model.collection.drop().catch((err: { codeName?: string }) => {
      if (err.codeName !== "NamespaceNotFound") throw err;
    });
    await model.syncIndexes();
  }

  const users = await User.insertMany(DEMO_USERS);
  const id = (i: number) => users[i]!._id;
  const start = Date.now() - 3 * 60 * MINUTE;

  async function seed(
    conversation: { type: "direct" | "group"; participants: Types.ObjectId[]; [k: string]: unknown },
    lines: Line[],
  ) {
    const created = await Conversation.create(conversation);
    const docs = lines.map(([from, text], n) => {
      const at = new Date(start + n * 7 * MINUTE);
      return { conversation: created._id, sender: id(from), text, createdAt: at, updatedAt: at };
    });
    await Message.insertMany(docs);
    const last = docs[docs.length - 1]!;
    await Conversation.updateOne(
      { _id: created._id },
      { $set: { lastMessage: { text: last.text, sender: last.sender, createdAt: last.createdAt } } },
      { timestamps: false },
    );
  }

  for (const chat of DIRECT_CHATS) {
    const [a, b] = chat.users;
    await seed(
      {
        type: "direct",
        participants: [id(a), id(b)],
        directKey: [id(a).toString(), id(b).toString()].sort().join(":"),
      },
      chat.lines,
    );
  }
  for (const group of GROUPS) {
    await seed(
      {
        type: "group",
        name: group.name,
        participants: group.members.map(id),
        createdBy: id(group.admin),
        admins: [id(group.admin)],
      },
      group.lines,
    );
  }

  console.log(
    `Demo data reset: ${users.length} users, ${DIRECT_CHATS.length + GROUPS.length} conversations, ` +
      `${await Message.countDocuments()} messages.`,
  );
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error(err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
