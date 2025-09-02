-- AlterTable
-- Add foreign key constraints to User_UserGroup table to establish proper relations

-- Add foreign key constraint from User_UserGroup.userId to User.id
ALTER TABLE "User_UserGroup" ADD CONSTRAINT "User_UserGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key constraint from User_UserGroup.groupId to UserGroup.id  
ALTER TABLE "User_UserGroup" ADD CONSTRAINT "User_UserGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "UserGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
